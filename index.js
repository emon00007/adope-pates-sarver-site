const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIP_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const { Await } = require('react-router-dom');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.x8jkuyh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server (optional starting in v4.7)
        // await client.connect();

        const petListCollection = client.db("adopets").collection("petlisting");
        const donationCollection = client.db("adopets").collection("donation");
        const UsersCollection = client.db("adopets").collection("users");
        const petRequestCollection = client.db("adopets").collection("petRequest");
        const PaymentCollection = client.db("adopets").collection("Payment");


        // jwt related api


        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token })
        })

        // middleware
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                // console.log(req.decoded);
                next();
            })
        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await UsersCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            // console.log(req.decoded)
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            const query = { email: email };
            const user = await UsersCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            res.send({ admin: isAdmin });
        });

        app.get('/users/User/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            // console.log(req.decoded);

            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            const query = { email: email };
            const user = await UsersCollection.findOne(query);
            const isUser = user?.role === 'user';
            res.send({ user: isUser });
        });


        app.get('/petlisting', async (req, res) => {
            const { category, search } = req.query;
            const query = {};
            if (category) {
                query.category = category;
            }
            if (search) {
                query.$or = [
                    { petName: { $regex: search, $options: 'i' } },
                    { shortDescription: { $regex: search, $options: 'i' } }
                ];
            }
            const result = await petListCollection.find(query).sort({ date: -1 }).toArray();
            res.send(result);
        });

        const isValidObjectId = (id) => {
            return ObjectId.isValid(id) && (String(new ObjectId(id)) === id);
        };

        app.get('/petlisting/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const query = { _id: new ObjectId(id) };
            const result = await petListCollection.findOne(query);
            res.send(result)
        });

        app.patch('/UpdatePat/:id',verifyToken ,async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    petName: item.petName,
                    petAge: item.petAge,
                    category: item.category,
                    petLocation: item.petLocation,
                    shortDescription: item.shortDescription,
                    longDescription: item.longDescription,
                    petImage: item.petImage
                }
            }
            const result = await petListCollection.updateOne(filter, updateDoc)
            res.send(result)
            // console.log(id)
        });


        app.post('/addpet',verifyToken ,async (req, res) => {
            const item = req.body;
            const result = await petListCollection.insertOne(item);
            res.send(result);
        });

        app.get('/mypetlisting',verifyToken, async (req, res) => {
            const result = await petListCollection.find().toArray();
            res.send(result)
        })


        app.get('/mypetlisting/:email',verifyToken ,async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const result = await petListCollection.find(filter).toArray();
            res.send(result);
        });

        app.patch('/adopt/:id',verifyToken, async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    adopted: item.adopted
                }
            }
            const result = await petListCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.patch('/petaddRequeste/:id',verifyToken, async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    adopted: item.adopted
                }
            }
            // console.log(filter, updateDoc)
            const result = await petListCollection.updateOne(filter, updateDoc);
            // console.log(result)
            // console.log("asdhjkl;", filter);
            res.send(result)

        })


        app.delete('/delete/:id',verifyToken, async (req, res) => {
            const result = await petListCollection.deleteOne({
                _id: new ObjectId(req.params.id)
            })
            // console.log(result)
            res.send(result)
        })






        // payment related 
        app.post('/create-payment-intent', verifyToken, async (req, res) => {
            const { price } = req.body;
            console.log(price);
            if (!price || isNaN(price) || parseFloat(price) < 0.5) {
                return res.status(400).send({ error: 'Invalid amount' });
            }

            try {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: Math.round(parseFloat(price) * 100),
                    currency: 'usd',
                    // optional: enable automatic payment methods
                    automatic_payment_methods: {
                        enabled: true,
                    },
                });

                res.send({ clientSecret: paymentIntent.client_secret });
            } catch (error) {
                console.error('Error creating payment intent:', error);
                res.status(500).send({ error: 'Failed to create payment intent' });
            }
        });


        app.post('/payments',verifyToken ,async (req, res) => {
            payment = req.body;
            const paymentRequest = await PaymentCollection.insertOne(payment);
            res.send(paymentRequest)
        })

        // app.get ('/payment/:email',async(req,res)=>{
        //     const query={email:req.params.email}
        //     const result = await PaymentCollection.find(query).toArray();
        //     res.send(result)
        //     console.log(query,result);

        // })
        // app.get ('/payment/:donationId',async(req,res)=>{
        //     const query={donationId:req.params.donationId}
        //     const result = await PaymentCollection.find(query).toArray();
        //     res.send(result)
        //     console.log(donationId,result);

        // })
        app.get('/paymentDetails/:id',verifyToken,async(req,res)=>{
            const id =req.params.id
            const query ={donationId:id}
            const result = await PaymentCollection.find(query).toArray();
            res.send(result)
            console.log(result,query);
        })


        app.patch('/campaign/:id', verifyToken, async (req, res) => {
            const { id } = req.params;
            const { status} = req.body;
            
            const filter = { _id: new ObjectId(id) }
            // console.log(id,item,filter);
            const updateDoc={
                $set:{
                    status:status
                }
                
            }
            const result  = await donationCollection.updateOne(filter,updateDoc)
            res.send(result)
        });

        // admin operation

        app.patch('/campaign/admin/:id', verifyToken,verifyAdmin, async (req, res) => {
            const { id } = req.params;
            const { status} = req.body;
            
            const filter = { _id: new ObjectId(id) }
            // console.log(id,item,filter);
            const updateDoc={
                $set:{
                    status:status
                }
                
            }
            const result  = await donationCollection.updateOne(filter,updateDoc)
            res.send(result)
        });

        app.post('/donation', verifyToken, async (req, res) => {
            const item = req.body;
            const result = await donationCollection.insertOne(item);
            res.send(result);
        });

        app.get('/donation/:email',verifyToken, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const result = await donationCollection.find(filter).toArray();
            res.send(result);
            // console.log('server hitted', result)
        });
        app.get('/donationUpdate/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const query = { _id: new ObjectId(id) };
            const result = await donationCollection.findOne(query);
            res.send(result)
        });

        app.patch('/UpdateDonate/:id',verifyToken, async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    ...item
                }
            }
            const result = await donationCollection.updateOne(filter, updateDoc)
            res.send(result)
            // console.log(id)
        });





        app.get('/donationCampaign', async (req, res) => {
            const result = await donationCollection.find().toArray();
            res.send(result)
            // console.log(result)
        })
        app.get('/donationCampaign/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await donationCollection.findOne(query);
            res.send(result)
            // console.log(result)
        })


        app.post('/userAdded', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await UsersCollection.findOne(query)
            if (existingUser) {
                return res.send({ massage: 'user Already Exists', insertedId: null })
            }
            const result = await UsersCollection.insertOne(user);
            res.send(result);
        });

        app.get('/allUser', verifyToken, verifyAdmin, async (req, res) => {
            // console.log(req.headers);
            const result = await UsersCollection.find().toArray();
            res.send(result)

        })
        app.get('/allDonation', verifyToken, verifyAdmin, async (req, res) => {
            const result = await donationCollection.find().toArray();
            res.send(result)

        })
        app.delete('/allDonation/:id',verifyToken,verifyAdmin ,async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await donationCollection.deleteOne(query);
            res.send(result);
        })
        app.get('/allPets',verifyToken, verifyAdmin,async (req, res) => {
            const result = await petListCollection.find().toArray();
            res.send(result)

        })

        app.delete('/allPets/:id',verifyToken ,verifyAdmin,async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await petListCollection.deleteOne(query);
            res.send(result);
        })

        app.patch('/allUsers/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await UsersCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.post('/petaddRequest',verifyToken, async (req, res) => {
            const item = req.body;
            const result = await petRequestCollection.insertOne(item);
            res.send(result);
        });



        app.get('/petaddRequest/:posterEmail',verifyToken, async (req, res) => {
            const email = req.params.posterEmail;
            const filter = { posterEmail: email };
            // console.log('Filter:', filter);
            const result = await petRequestCollection.find(filter).toArray();
            res.send(result);
            // console.log('Result:', result);
        });





        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('pets is running');
});

app.listen(port, () => {
    console.log(`pets is running on port ${port}`);
});
