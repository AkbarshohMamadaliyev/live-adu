import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { randomBytes } from "crypto";
import { sequelize } from "../connection";
import { Category } from "./Category";

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString("hex");
  return `c${timestamp}${random}`;
}

export class Subcategory extends Model<
  InferAttributes<Subcategory>,
  InferCreationAttributes<Subcategory>
> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare description: string | null;
  declare categoryId: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Subcategory.init(
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    categoryId: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: "category_id",
      references: {
        model: "categories",
        key: "id",
      },
      onDelete: "CASCADE",
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
    tableName: "subcategories",
    underscored: true,
  },
);

// Associations
Category.hasMany(Subcategory, {
  foreignKey: "categoryId",
  as: "subcategories",
  onDelete: "CASCADE",
});
Subcategory.belongsTo(Category, { foreignKey: "categoryId", as: "category" });
