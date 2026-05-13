// All models are imported here so Sequelize registers them
import { Category } from "./models/Category";
import { Subcategory } from "./models/Subcategory";
import { Camera } from "./models/Camera";
import { sequelize } from "./connection";

export { Category, Subcategory, Camera, sequelize };
