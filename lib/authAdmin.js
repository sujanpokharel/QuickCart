import { getCurrentUser } from '@/lib/auth';

const authAdmin = async () => {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return false;
        }

        return user.isAdmin === true;
    } catch (error) {
        console.error('Auth admin error:', error);
        return false;
    }
}

export default authAdmin;
