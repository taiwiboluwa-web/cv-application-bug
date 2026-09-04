import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, profile, account }) {
      if (profile?.sub) token.googleSub = profile.sub;
      if (account?.access_token) token.googleAccessToken = account.access_token;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.googleSub ?? token.sub ?? '');
      }
      return session;
    },
  },
  pages: { signIn: '/' },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
