import { getCurrentUser } from '@/lib/auth';

const authSeller = async () => {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return false;
        }

        return user.isSeller === true;
    } catch (error) {
        console.error('Auth seller error:', error);
        return false;
    }
}

export default authSeller;