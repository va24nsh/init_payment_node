import { initDatabase } from "./config/prisma";
import { connectKafka } from "./config/kafka";
import { app } from "./app";

const PORT = process.env.PORT || 5002;

const startServer = async () => {
  try {
    await initDatabase();
    await connectKafka();

    app.listen(PORT, () => {
      console.log(`Payment service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();