import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { randomBytes } from "crypto";
import { sequelize } from "../connection";
import { Subcategory } from "./Subcategory";

/**
 * Camera modeli
 */
export class Camera extends Model<
  InferAttributes<Camera>,
  InferCreationAttributes<Camera>
> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare location: string | null;
  declare ipAddress: string;
  declare port: CreationOptional<number>;
  declare rtspPort: CreationOptional<number>;
  declare username: string;
  declare password: string;
  declare channel: CreationOptional<number>;
  declare streamType: CreationOptional<number>;
  declare rtspPath: CreationOptional<string | null>;
  declare isActive: CreationOptional<boolean>;
  declare subcategoryId: string | null;
  declare description: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

// CUID-like ID generator (Prisma cuid o'rniga oddiy unique ID)
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString("hex");
  return `c${timestamp}${random}`;
}

Camera.init(
  {
    id: {
      type: DataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generateId,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(45), // IPv6 ham sig'sin
      allowNull: false,
      field: "ip_address",
    },
    port: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 80,
    },
    rtspPort: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 554,
      field: "rtsp_port",
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    channel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    streamType: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1, // 1 = main, 2 = sub
      field: "stream_type",
    },
    rtspPath: {
      // Custom RTSP URL path. Agar berilgan bo'lsa, Hikvision shabloni o'rniga shu ishlatiladi.
      // Misol: "/Streaming/Channels/101" (Hikvision), "/cam/realmonitor?channel=1&subtype=0" (Dahua),
      // "/h264Preview_01_main" (Reolink), yoki bo'sh — port'dan keyin path qo'shilmaydi.
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      field: "rtsp_path",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    subcategoryId: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: "subcategory_id",
      references: {
        model: "subcategories",
        key: "id",
      },
      onDelete: "SET NULL",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
  },
  {
    sequelize,
    tableName: "cameras",
    indexes: [{ fields: ["is_active"] }, { fields: ["subcategory_id"] }],
  },
);

// Associations
Subcategory.hasMany(Camera, {
  foreignKey: "subcategoryId",
  as: "cameras",
  onDelete: "SET NULL",
});
Camera.belongsTo(Subcategory, {
  foreignKey: "subcategoryId",
  as: "subcategory",
});
