import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "blue" }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Trash Duty",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={20} name="trash-o" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: "Weekly Schedule",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={20} name="calendar" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: "Finance",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={20} name="money" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rules"
        options={{
          title: "Rules",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={20} name="clipboard" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
