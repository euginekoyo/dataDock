import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function userActivity(req, res) {
    let client;
    try {
        client = await clientPromise;
        const db = client.db(process.env.DATABASE_NAME || 'DataDock');

        // Check if user_activity collection exists
        const collections = await db.listCollections({ name: 'user_activity' }).toArray();
        const collectionExists = collections.length > 0;

        const expectedValidator = {
            $jsonSchema: {
                bsonType: 'object',
                required: ['userId', 'collection_name', 'action', 'timestamp'],
                properties: {
                    userId: { bsonType: 'objectId' },
                    collection_name: { bsonType: 'string' },
                    workspace: { bsonType: ['string', 'null'] }, // Made optional
                    organization: { bsonType: ['string', 'null'] }, // Made optional
                    action: { bsonType: 'string' },
                    row_id: { bsonType: ['objectId', 'null'] },
                    timestamp: { bsonType: 'date' },
                },
            },
        };

        if (!collectionExists) {
            try {
                await db.createCollection('user_activity', {
                    validator: expectedValidator,
                    validationLevel: 'strict',
                    validationAction: 'error',
                });
            } catch (createErr) {
                console.error('Failed to create user_activity collection:', createErr.message);
                return res.status(500).json({ error: 'Failed to create user_activity collection', details: createErr.message });
            }
        } else {
            // Verify validator
            const collectionInfo = await db.listCollections({ name: 'user_activity' }).toArray();
            const currentValidator = collectionInfo[0]?.options?.validator;

            if (!currentValidator || JSON.stringify(currentValidator) !== JSON.stringify(expectedValidator)) {
                try {
                    await db.command({
                        collMod: 'user_activity',
                        validator: expectedValidator,
                        validationLevel: 'strict',
                        validationAction: 'error',
                    });
                    console.log('Successfully updated user_activity validator');
                } catch (modErr) {
                    console.error('Failed to update validator:', modErr.message);
                    return res.status(500).json({ error: 'Failed to update validator', details: modErr.message });
                }
            }
        }

        switch (req.method) {
            case 'POST':
                try {
                    const { userId, collection_name, workspace, organization, action, row_id } = req.body;

                    if (!userId || !ObjectId.isValid(userId)) {
                        return res.status(400).json({ error: 'Invalid or missing userId' });
                    }
                    if (!collection_name || !action) {
                        return res.status(400).json({ error: 'Missing collection_name or action' });
                    }

                    const activity = {
                        userId: new ObjectId(userId),
                        collection_name,
                        workspace: workspace || 'default_workspace',
                        organization: organization || 'default_organization',
                        action,
                        row_id: row_id && ObjectId.isValid(row_id) ? new ObjectId(row_id) : null,
                        timestamp: new Date(),
                    };

                    try {
                        const result = await db.collection('user_activity').insertOne(activity);
                        res.json({ success: true, activityId: result.insertedId });
                    } catch (insertErr) {
                        console.error('Insertion error:', insertErr);
                        if (insertErr.name === 'MongoServerError' && insertErr.code === 121) {
                            console.error('Validation error details:', insertErr.errInfo);
                            throw new Error(`Document failed validation: ${JSON.stringify(insertErr.errInfo)}`);
                        }
                        throw insertErr;
                    }
                } catch (err) {
                    console.error('Error in POST:', err.message);
                    res.status(500).json({ error: 'Failed to log activity', details: err.message });
                }
                break;

            case 'GET':
                try {
                    const { collection_name } = req.query;
                    const query = collection_name ? { collection_name } : {};

                    const activities = await db
                        .collection('user_activity')
                        .aggregate([
                            { $match: query },
                            {
                                $lookup: {
                                    from: 'users',
                                    localField: 'userId',
                                    foreignField: '_id',
                                    as: 'user',
                                },
                            },
                            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
                            {
                                $group: {
                                    _id: { userId: '$userId', collection_name: '$collection_name', workspace: '$workspace', organization: '$organization', action: '$action' },
                                    userName: { $first: { $ifNull: ['$user.name', 'Unknown'] } },
                                    lastActivity: { $max: '$timestamp' },
                                    actionCount: { $sum: 1 },
                                },
                            },
                            {
                                $project: {
                                    userId: '$_id.userId',
                                    collection_name: '$_id.collection_name',
                                    workspace: '$_id.workspace',
                                    organization: '$_id.organization',
                                    action: '$_id.action',
                                    userName: 1,
                                    lastActivity: 1,
                                    actionCount: 1,
                                    _id: 0,
                                },
                            },
                            { $sort: { lastActivity: -1 } },
                        ])
                        .toArray();

                    res.json({ status: 200, data: activities });
                } catch (err) {
                    console.error('Error in GET:', err.message);
                    res.status(200).json({ status: 200, data: [] });
                }
                break;

            default:
                res.status(405).json({ error: 'Method not allowed' });
                break;
        }
    } catch (err) {
        console.error('Database connection error:', err.message);
        res.status(500).json({ error: 'Database connection failed', details: err.message });
    }
}