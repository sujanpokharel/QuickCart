import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "quickcart-next" });


// inngest function to save to the database
import { inngest } from "./client";
import connectDB from "./db";
import User from "../models/user";

export const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event, step }) => {
    const{id, first_name, lasr_name, email_addresses, inage_url } = event.data;
    const userData = {
        _id:id,
        email: email_addresses[0].email_address,
        name: first_name + " " + last_name,
        imageUrl: image_url,

    }
    await connectDB();
    await User.create(userData);
  },
);

// inngest function to update the user data in database
export const syncUserUpdate = inngest.createFunction(
  { id: "update-user_from_clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } = event.data;
    const userData = {
        email: email_addresses[0].email_address,
        name: first_name + " " + last_name,
        imageUrl: image_url,
    }
    await connectDB();
    await User.findByIdAndUpdate(id, userData);
  },
);

// inngest function to delete the user from the database
export const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event}) => {
    const { id } = event.data;
    await connectDB();
    await User.findByIdAndDelete(id);
  },
);

