import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        // Check if user exists with same email
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Link Google ID to existing user
          user.googleId = profile.id;
          user.authProvider = 'google';
          if (!user.profile.profilePicture && profile.photos[0]) {
            user.profile.profilePicture = profile.photos[0].value;
          }
          await user.save();
          return done(null, user);
        }

        // Create new user
        const newUser = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          authProvider: 'google',
          role: 'employee',
          profile: {
            profilePicture: profile.photos[0] ? profile.photos[0].value : null
          }
        });

        done(null, newUser);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
