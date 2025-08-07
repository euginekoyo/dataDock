import clientPromise from '../../../../Desktop/yobulkdev/lib/mongodb';
import { ObjectId } from 'mongodb';

export const User = {
  async findByEmail(email) {
    const client = await clientPromise;
    return await client.db(process.env.DATABASE_NAME).collection('users').findOne({ email });
  },

  async create(user) {
    const client = await clientPromise;
    return await client.db(process.env.DATABASE_NAME).collection('users').insertOne(user);
  },

  async findAll() {
    const client = await clientPromise;
    return await client.db(process.env.DATABASE_NAME).collection('users').find({}).toArray();
  },

  async update(id, updates) {
    const client = await clientPromise;
    return await client.db(process.env.DATABASE_NAME).collection('users').updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
    );
  },

  async delete(id) {
    const client = await clientPromise;
    return await client.db(process.env.DATABASE_NAME).collection('users').deleteOne({ _id: new ObjectId(id) });
  },
};