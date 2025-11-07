import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDatabase, ref, set } from 'firebase/database';
import { registerForPushNotificationsAsync } from '@/helpers/notifications';
import { HOUSEMATES } from '@/constants';
import { initializeApp } from 'firebase/app';
import { FirebaseConfig } from '@/configs/db';

interface IContextType {
  currentUser: string | null;
  setCurrentUser: (user: string) => void;
  pushToken: string | null;
}

const Context = createContext<IContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  pushToken: null,
});

const app = initializeApp(FirebaseConfig);
const database = getDatabase(app);


export const useUser = () => useContext(Context);

export const UserProvider: React.FC<{ children: React.ReactNode}> = ({ 
  children, 
}) => {
  const [currentUser, setCurrentUserState] = useState<string | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    // Register for push notifications and get token
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setPushToken(token);
      }
    });
  }, []);

  useEffect(() => {
    // Save push token to Firebase when user is selected
    if (currentUser && pushToken) {
      const userTokenRef = ref(database, `pushTokens/${currentUser}`);
      set(userTokenRef, {
        token: pushToken,
        lastUpdated: new Date().toISOString(),
      });
    }
  }, [currentUser, pushToken, database]);

  const setCurrentUser = (user: string) => {
    if (HOUSEMATES.includes(user)) {
      setCurrentUserState(user);
    }
  };

  return (
    <Context.Provider value={{ currentUser, setCurrentUser, pushToken }}>
      {children}
    </Context.Provider>
  );
};