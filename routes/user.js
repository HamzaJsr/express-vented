import express from "express"; // Importer express en tant que module
const router = express.Router(); // Créer un routeur Express
import User from "../models/User.js";

router.post("/user/signup", async (req, res) => {
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

      // Étape 2 : créer le nouvel utilisateur
      const newUser = new User({
        email: req.body.email,
        account: {
          username: req.body.username,
        },
        newsletter: req.body.newsletter,
      });

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

export default router;
