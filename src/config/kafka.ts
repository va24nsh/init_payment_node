import { Kafka, Producer } from "kafkajs";

const kafka = new Kafka({
  clientId: "payment-service",
  brokers: [process.env.KAFKA_BROKER || "kafka:9092"],
});

export const kafkaProducer = kafka.producer();
export const kafkaConsumer = kafka.consumer({
  groupId: "payment-service-group",
});

export const connectKafka = async () => {
  await kafkaProducer.connect();
  console.log("Kafka producer connected");

  // You can also set up consumers for relevant events
  await kafkaConsumer.connect();
  await kafkaConsumer.subscribe({ topic: "user-events", fromBeginning: true });

  kafkaConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (topic === "user-events") {
        const event = JSON.parse(message.value?.toString() || "{}");
        // Handle user events if needed
        console.log("Received user event:", event);
      }
    },
  });
};
