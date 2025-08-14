export const hasPermission = async (userRole, permission, token = null) => {
    try {
        const isBrowser = typeof window !== 'undefined';
        const authToken = isBrowser ? localStorage.getItem('token') : token;
        if (!authToken) {
            return { hasPerm: false, status: 401 };
        }

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';
        const response = await fetch(`${baseUrl}/api/roles/public`, {
            headers: { Authorization: `Bearer ${authToken}` },
        });

        if (response.ok) {
            const roles = await response.json();
            const role = roles.find(r => r.name === userRole);
            if (!role) {
                console.warn('hasPermission: Role not found', { userRole });
                return { hasPerm: false, status: 404 };
            }
            const hasPerm = role.permissions.includes(permission);
            return { hasPerm, status: hasPerm ? 200 : 403 }; // Return status 403 for denied permission
        } else {
            const errorData = await response.json().catch(() => ({}));
            return { hasPerm: false, status: response.status };
        }
    } catch (error) {
        console.error('hasPermission: Error fetching permissions', error.message);
        return { hasPerm: false, status: 500 };
    }
};