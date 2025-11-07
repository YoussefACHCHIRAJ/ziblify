import React from "react";
import { Stack } from "expo-router";
import { UserProvider } from "@/context/context";

export default function RootLayout() {
  return (
    <UserProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </UserProvider>
  );
}
