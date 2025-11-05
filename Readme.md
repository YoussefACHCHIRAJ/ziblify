# Trash Duty App

A simple React Native app built with Expo for managing household trash duty rotation among housemates.

## About

This is a personal side project created for internal house use to track and manage trash collection responsibilities. The app helps 4 housemates coordinate their weekly trash duty schedule with automatic rotation and accountability tracking.

## Features

- **Weekly Schedule**: Automatic rotation of trash duty assignments (Monday-Sunday)
- **Action Tracking**: Mark tasks as done or missed with real-time sync
- **Monthly Statistics**: Track each person's completion and missed count
- **Undo Protection**: Password-protected undo feature to prevent accidental changes
- **Auto-Reset**: Weekly schedule resets every Monday, monthly stats reset at month start
- **Real-time Sync**: Firebase Realtime Database keeps all devices in sync

## Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **Firebase Realtime Database** for data persistence and sync
- **EAS Build** for deployment

## How It Works

The app assigns each day of the week to a housemate in rotation. When someone completes their task, they mark it as "Done" or "Missed". The system tracks:
- Current week's schedule (resets every Monday)
- Monthly statistics per person (done/missed counts)
- Prevents multiple actions per day
- Allows undoing mistakes with password protection

## Usage Context

Built for a 4-person shared apartment to eliminate confusion about whose turn it is to take out the trash. Simple, practical, and effective for keeping everyone accountable.

---

*A practical solution for household chore coordination* 