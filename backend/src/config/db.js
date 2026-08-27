import mongoose from "mongoose";

const connectDB = async () => { 
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("mongoDB connected");
    } catch (error) {
        console.error("MongoDB error:", error.message);
}
}

export default connectDB;