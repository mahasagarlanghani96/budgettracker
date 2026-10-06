import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      hasProfilePhoto: boolean;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    hasProfilePhoto?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    hasProfilePhoto: boolean;
  }
}
