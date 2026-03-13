const mongoose = require("mongoose");
const dns = require("dns");

const connectDB = async () => {
  try {
    const atlasUri = process.env.MONGODB_ATLAS_URL;
    const localUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/shoping-mall";

    // 1순위: .env에 Atlas URL이 설정되어 있으면 반드시 Atlas에만 연결
    if (atlasUri) {
      // 일부 ISP DNS에서 Node SRV 조회가 ECONNREFUSED가 나는 경우를 회피한다.
      // 예: querySrv ECONNREFUSED _mongodb._tcp.<cluster>.mongodb.net
      if (atlasUri.startsWith("mongodb+srv://")) {
        const dnsServers = (
          process.env.MONGODB_DNS_SERVERS || "8.8.8.8,1.1.1.1"
        )
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        if (dnsServers.length > 0) {
          dns.setServers(dnsServers);
        }
      }

      const conn = await mongoose.connect(atlasUri);
      console.log(
        `MongoDB (Atlas) connected: ${conn.connection.host}/${conn.connection.name}`
      );
      console.log("몽고DB (Atlas) 연결 성공했습니다.");
      return;
    }

    // 2순위: Atlas URL이 없을 때만 로컬 / 일반 URI로 연결
    const conn = await mongoose.connect(localUri);
    console.log(
      `MongoDB (local) connected: ${conn.connection.host}/${conn.connection.name}`
    );
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
