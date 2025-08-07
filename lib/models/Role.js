import clientPromise from '../../../../Desktop/yobulkdev/lib/mongodb';

export const Role = {
  async findAll() {
    return Object.keys(ROLES).map(role => ({
      name: role,
      permissions: PERMISSIONS[role]
    }));
  }
};