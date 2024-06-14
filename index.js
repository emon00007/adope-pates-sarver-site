const express = require('express');
const app = express();
const cors = require('cors');
// const jwt =require('jsonwebtoken')
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { Await } = require('react-router-dom');
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
        await client.connect();

        const petListCollection = client.db("adopets").collection("petlisting");
        const donationCollection = client.db("adopets").collection("donation");
        const UsersCollection = client.db("adopets").collection("users");
        const petRequestCollection = client.db("adopets").collection("petRequest");

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
            console.log(id);
            const query = { _id: new ObjectId(id) };
            const result = await petListCollection.findOne(query);
            res.send(result)
        });

        app.patch('/UpdatePat/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter ={_id:new ObjectId(id)}
            const updateDoc={
                $set:{
                    petName:item.petName,
                    petAge:item.petAge,
                    category:item.category,
                    petLocation:item.petLocation,
                    shortDescription:item.shortDescription,
                    longDescription:item.longDescription,
                    petImage:item.petImage
                }
            }
            const result =await petListCollection.updateOne(filter,updateDoc)
            res.send(result)
            console.log(id)
        });


        app.post('/addpet', async (req, res) => {
            const item = req.body;
            const result = await petListCollection.insertOne(item);
            res.send(result);
        });

        app.get('/mypetlisting', async (req, res) => {
            const result = await petListCollection.find().toArray();
            res.send(result)
        })


        app.get('/mypetlisting/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const result = await petListCollection.find(filter).toArray();
            res.send(result);
        });

        app.patch('/adopt/:id', async (req, res) => {
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

        app.patch('/petaddRequeste/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    adopted: item.adopted
                }
            }
            console.log(filter, updateDoc)
            const result = await petListCollection.updateOne(filter, updateDoc);
            console.log(result)
            res.send(result)

        })

        app.delete('/delete/:id', async (req, res) => {
            const result = await petListCollection.deleteOne({
                _id: new ObjectId(req.params.id)
            })
            console.log(result)
            res.send(result)
        })





        app.post('/donation', async (req, res) => {
            const item = req.body;
            const result = await donationCollection.insertOne(item);
            res.send(result);
        });

        app.get('/donation/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const result = await donationCollection.find(filter).toArray();
            res.send(result);
        });
        app.get('/donationUpdate/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) };
            const result = await donationCollection.findOne(query);
            res.send(result)
        }); 
        
        app.patch('/UpdateDonate/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter ={_id:new ObjectId(id)}
            const updateDoc={
                $set:{
                    ...item
                }
            }
            const result =await donationCollection.updateOne(filter,updateDoc)
            res.send(result)
            console.log(id)
        });





        app.get('/donationCampaign', async (req, res) => {
            const result = await donationCollection.find().toArray();
            res.send(result)
            // console.log(result)
        })
        app.get('/donationCampaign/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await donationCollection.findOne();
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

        app.get('/allUser', async (req, res) => {
            const result = await UsersCollection.find().toArray();
            res.send(result)

        })
        app.get('/allDonation', async (req, res) => {
            const result = await donationCollection.find().toArray();
            res.send(result)

        })
        app.delete('/allDonation/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await donationCollection.deleteOne(query);
            res.send(result);
        })
        app.get('/allPets', async (req, res) => {
            const result = await petListCollection.find().toArray();
            res.send(result)

        })

        app.delete('/allPets/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await petListCollection.deleteOne(query);
            res.send(result);
        })

        app.patch('/allUsers/admin/:id', async (req, res) => {
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

        app.post('/petaddRequest', async (req, res) => {
            const item = req.body;
            const result = await petRequestCollection.insertOne(item);
            res.send(result);
        });



        app.get('/petaddRequest/:posterEmail', async (req, res) => {
            const email = req.params.posterEmail;
            const filter = { posterEmail: email };
            console.log('Filter:', filter);
            const result = await petRequestCollection.find(filter).toArray();
            res.send(result);
            console.log('Result:', result);
        });





        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
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
