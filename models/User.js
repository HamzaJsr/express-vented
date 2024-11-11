import mongoose from "mongoose";

// Définition du schema pour un utilisateur
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true, // Le champ email est requis
      unique: true, // Unicité : deux utilisateurs ne peuvent pas avoir le même email
      match: [/.+\@.+\..+/, "Please fill a valid email address"], // Validation basique de l'email
    },
    account: {
      username: {
        type: String,
        required: true, // Le champ username est requis
        minlength: 4, // La longueur minimale du username est 3 caractères
        maxlength: 50, // La longueur maximale du username est 50 caractères
      },
      avatar: {
        type: Object, // Le champ avatar peut être un objet (comme un URL d'image, etc.)
        default: null, // Valeur par défaut est null
      },
    },
    newsletter: {
      type: Boolean,
      default: false, // Valeur par défaut : false (l'utilisateur ne s'abonne pas à la newsletter par défaut)
    },
    token: {
      type: String,
      default: null, // Par défaut, il n'y a pas de token
    },
    hash: {
      type: String,
      default: null, // Par défaut, pas de hash
    },
    salt: {
      type: String,
      default: null, // Par défaut, pas de salt
    },
  },
  {
    timestamps: true, // Ajoute des champs createdAt et updatedAt automatiquement
  }
);

// Création du modèle basé sur le schema
const User = mongoose.model("User", userSchema);

// Exportation du modèle User pour l'utiliser dans d'autres fichiers

export default User;
