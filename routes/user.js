import express from "express"; // Importer express en tant que module
const router = express.Router(); // Créer un routeur Express
import User from "../models/User.js";
import CryptoJS from "crypto-js"; // Hash et base 64 du mdp
import uid2 from "uid2"; // Salt du mdp
import { v2 as cloudinary } from "cloudinary";
import convertToBase64 from "../utils/convertToBase64.js";
import fileUpload from "express-fileupload";

router.post("/user/signup", fileUpload(), async (req, res) => {
  // Recherche dans la BDD. Est-ce qu'un utilisateur possède cet email ?
  const user = await User.findOne({ email: req.body.email });

  // Si oui, on renvoie un message et on ne procède pas à l'inscription
  if (user) {
    res.status(409).json({ message: "Il y a déja un compte avec cet email" });

    // sinon, on passe à la suite...
  } else {
    // l'utilisateur a-t-il bien envoyé les informations requises ?
    if (req.body.email && req.body.password && req.body.username) {
      // Si oui, on peut créer ce nouvel utilisateur

      // Étape 1 : encrypter le mot de passe
      // Générer le token et encrypter le mot de passe
      const email = req.body.email;
      const password = req.body.password;
      const token = uid2(64);
      const salt = uid2(64);
      const hash = CryptoJS.SHA256(password + salt).toString(
        CryptoJS.enc.Base64
      );

      // Étape 2 : créer le nouvel utilisateur
      const newUser = new User({
        email,
        token,
        salt,
        hash,
        account: {
          username: req.body.username,
        },
        newsletter: req.body.newsletter,
      });

      // Si je reçois une image, je l'upload sur cloudinary et j'enregistre le résultat dans la clef avatar de la clef account de mon nouvel utilisateur
      if (req.files?.avatar) {
        const result = await cloudinary.uploader.upload(
          convertToBase64(req.files.avatar),
          {
            folder: `api/vinted-v2/users/${newUser._id}`,
            public_id: "avatar",
          }
        );
        newUser.account.avatar = result;
      }

      // Étape 3 : sauvegarder ce nouvel utilisateur dans la BDD
      await newUser.save();
      res.status(201).json({
        _id: newUser._id,
        email: newUser.email,
        account: newUser.account,
      });
    } else {
      // l'utilisateur n'a pas envoyé les informations requises ?
      res.status(400).json({ message: "Missing parameters" });
    }
  }
});

router.post("/user/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (user) {
      // Est-ce qu'il a rentré le bon mot de passe ?
      // req.body.password
      // user.hash
      // user.salt
      if (
        CryptoJS.SHA256(req.body.password + user.salt).toString(
          CryptoJS.enc.Base64
        ) === user.hash
      ) {
        res.status(200).json({
          _id: user._id,
          token: user.token,
          account: user.account,
        });
      } else {
        res.status(401).json({ error: "Unauthorized" });
      }
    } else {
      res.status(400).json({ message: "User not found" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

export default router;
