import { useEffect, useState } from "react";

import {
  registerForPushNotificationsAsync,
  storePushTokenInFirebase,
} from "@/helpers/notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Database } from "firebase/database";

const useNotification = ({ database }: { database: Database }) => {
  const [pushToken, setPushToken] = useState<string>("");

  useEffect(() => {
    const setupPushNotifications = async () => {
      const storedToken = (await AsyncStorage.getItem("pushToken")) || "";
      const newToken = await registerForPushNotificationsAsync();

      if (!newToken || storedToken === newToken) {
        setPushToken(storedToken);
        return;
      }

      await AsyncStorage.setItem("pushToken", newToken);
      await storePushTokenInFirebase(database, newToken);
      setPushToken(newToken);
      console.log("Saved Push Token");
    };

    setupPushNotifications();
  }, []);

  return pushToken;
};

export default useNotification;
