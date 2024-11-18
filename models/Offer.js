import mongoose from "mongoose";

const offerSchema = mongoose.Schema({
  product_name: {
    type: String,
    required: true,
    maxlength: [50, "Le titre ne peut pas dépasser 50 caractères"],
  },
  product_description: {
    type: String,
    required: true,
    maxlength: [500, "La description ne peut pas dépasser 500 caractères"],
  },
  product_price: {
    type: Number,
    required: true,
    min: [0, "Le prix ne peut pas être négatif"],
    max: [10000, "Le prix ne peut pas dépasser 100000"],
  },
  product_details: Array,
  product_image: { type: mongoose.Schema.Types.Mixed, default: {} }, // mongoose.Schema.Types.Mixed est un type souple qui peut contenir n'importe quel type
  product_pictures: Array,
  product_date: { type: Date, default: Date.now },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const Offer = mongoose.model("Offer", offerSchema);

export default Offer;
