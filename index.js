const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        if (!isValidObjectId(id)) {
            return res.status(400).send({ message: 'Invalid ID format' });
        }
        const query = { _id: new ObjectId(id) };
        const result = await petListCollection.findOne(query);
        if (result) {
            res.send(result);
        } else {
            res.status(404).send({ message: 'Pet not found' });
        }
    });

    app.post('/petlisting', async (req, res) => {
        const item = req.body;
        const result = await petListCollection.insertOne(item);
        res.send(result);
    });
    app.get('/mypetlisting',async(req,res)=>{
        const result = await petListCollection.find().toArray();
        res.send(result)
        console.log(result)
    })

    // app.get('/mypetlisting/:email', async (req, res) => {
    //     const email = req.params.email;
    //     const filter = { useremail: email };
    //     const result = await petListCollection.find(filter).toArray();
    //     res.send(result);
    //     console.log(email)
    // });

    app.get('/mypetlisting/:email', async (req, res) => {
        const email = req.params.email;
        const filter = { email: email };
        console.log('Filter:', filter); // Log the filter
        const result = await petListCollection.find(filter).toArray();
        res.send(result);
        console.log('Result:', result); // Log the result
    });

    app.patch('/adopt/:id',async(req,res)=>{
        const item =req.body;
        const id = req.params.id;
        const filter ={_id: new ObjectId(id)  }
        const updateDoc = {
            $set :{
            adopted:item.adopted 
            }
        }
        const result = await petListCollection.updateOne(filter,updateDoc);
        res.send(result)
    })

    app.delete('/delete/:id',async(req,res)=>{
        const result = await petListCollection.deleteOne({
            _id: new ObjectId(req.params.id)
        })
        console.log(result)
        res.send(result)
    })

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
