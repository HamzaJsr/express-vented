import express from "express";
import { v2 as cloudinary } from "cloudinary";
import fileUpload from "express-fileupload";
const router = express.Router(); // Créer un routeur Express
import User from "../models/User.js";
import Offer from "../models/Offer.js";
import convertToBase64 from "../utils/convertToBase64.js";
import isAuthenticated from "../middleware/isAuthenticated.js";

router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      // destructuring des clefs title, description, price, brand, size, condition, color et city de l'objetreq.body
      const { title, description, price, brand, size, condition, color, city } =
        req.body;

      if (title && price && req.files?.picture) {
        // req.files?.picture est du optional chaining : si req n'a pas de clef files et qu'on n'avait pas mis le ?, le fait de chercher à lire sa clef picture provoquerait une erreur. Grâce à l'optional chaining, si files n'existe pas, la clef picture n'est pas lue et on ne passe pas dans le if.
        // Création de la nouvelle annonce (sans l'image) on y ajoutera l'image par la suite
        const newOffer = new Offer({
          product_name: title,
          product_description: description,
          product_price: price,
          product_details: [
            { MARQUE: brand },
            { TAILLE: size },
            { ÉTAT: condition },
            { COULEUR: color },
            { EMPLACEMENT: city },
          ],
          owner: req.user,
        });

        if (!Array.isArray(req.files.picture)) {
          // On vérifie qu'on a bien affaire à une image
          if (req.files.picture.mimetype.slice(0, 5) !== "image") {
            return res.status(400).json({ message: "You must send images" });
          }
          // Envoi de l'image à cloudinary
          const result = await cloudinary.uploader.upload(
            convertToBase64(req.files.picture),
            {
              // Dans le dossier suivant
              folder: `api/vinted-v2/offers/${newOffer._id}`,
              // Avec le public_id suivant
              public_id: "preview",
            }
          );

          // ajout de l'image dans newOffer
          newOffer.product_image = result;
          // On rajoute l'image à la clef product_pictures
          newOffer.product_pictures.push(result);
        } else {
          // Si on a affaire à un tableau, on le parcourt
          for (let i = 0; i < req.files.picture.length; i++) {
            const picture = req.files.picture[i];
            // Si on a afaire à une image
            if (picture.mimetype.slice(0, 5) !== "image") {
              return res.status(400).json({ message: "You must send images" });
            }
            if (i === 0) {
              // On envoie la première image à cloudinary et on en fait l'image principale (product_image)
              const result = await cloudinary.uploader.upload(
                convertToBase64(picture),
                {
                  folder: `api/vinted-v2/offers/${newOffer._id}`,
                  public_id: "preview",
                }
              );
              // ajout de l'image dans newOffer
              newOffer.product_image = result;
              newOffer.product_pictures.push(result);
            } else {
              // On envoie toutes les autres à cloudinary et on met les résultats dans product_pictures
              const result = await cloudinary.uploader.upload(
                convertToBase64(picture),
                {
                  folder: `api/vinted-v2/offers/${newOffer._id}`,
                }
              );
              newOffer.product_pictures.push(result);
            }
          }
        }
        await newOffer.save();
        res.status(201).json(newOffer);
      } else {
        res
          .status(400)
          .json({ message: "title, price and picture are required" });
      }
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ message: error.message });
    }
  }
);

router.get("/offers", async (req, res) => {
  try {
    // Création d'un objet dans lequel on va sotcker nos différents filtres
    let filters = {};
    // Si on reçoit un query title
    if (req.query.title) {
      // On rajoute une clef product_name contenant une RegExp créée à partir du query title
      filters.product_name = new RegExp(req.query.title, "i");
    }
    // Si on reçoit un query priceMin
    if (req.query.priceMin) {
      // On rajoute une clef à filter contenant { $gte: req.query.priceMin }
      filters.product_price = {
        $gte: req.query.priceMin,
      };
    }

    // Si on reçoit un query priceMax
    if (req.query.priceMax) {
      // Si on a aussi reçu un query priceMin
      if (filters.product_price) {
        // On rajoute une clef $lte contenant le query en question
        filters.product_price.$lte = req.query.priceMax;
      } else {
        // Sinon on fait comme avec le query priceMax
        filters.product_price = {
          $lte: req.query.priceMax,
        };
      }
    }
    // Création d'un objet sort qui servira à gérer le tri
    let sort = {};
    // Si on reçoit un query sort === "price-desc"
    if (req.query.sort === "price-desc") {
      // On réassigne cette valeur à sort
      sort = { product_price: -1 };
    } else if (req.query.sort === "price-asc") {
      // Si la valeur du query est "price-asc" on réassigne cette autre valeur
      sort = { product_price: 1 };
    }
    // Création de la variable page qui vaut, pour l'instant, undefined
    let page;
    // Si le query page n'est pas un nombre >= à 1
    if (Number(req.query.page) < 1) {
      // page sera par défaut à 1
      page = 1;
    } else {
      // Sinon page sera égal au query reçu
      page = Number(req.query.page);
    }
    // La variable limit sera égale au query limit reçu
    let limit = Number(req.query.limit);
    // On va chercher les offres correspondant aux query de filtre reçus grâce à filters, sort et limit. On populate la clef owner en n'affichant que sa clef account
    const offers = await Offer.find(filters)
      .populate({
        path: "owner",
        select: "account",
      })
      .sort(sort)
      .skip((page - 1) * limit) // ignorer les x résultats
      .limit(limit); // renvoyer y résultats

    // cette ligne va nous retourner le nombre d'annonces trouvées en fonction des filtres
    const count = await Offer.countDocuments(filters);

    res.json({
      count: count,
      offers: offers,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

router.get("/offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate({
      path: "owner",
      select: "account.username account.avatar",
    });
    res.json(offer);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

router.put(
  "/offer/update/:id",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    const id = req.params.id;

    const offerToModify = await Offer.findById(id);
    try {
      // Si on a reçu un title dans le body
      if (req.body.title) {
        // On remplace le product_name
        offerToModify.product_name = req.body.title;
      }
      // Idem pour la description
      if (req.body.description) {
        offerToModify.product_description = req.body.description;
      }
      // Idem pour le price
      if (req.body.price) {
        offerToModify.product_price = req.body.price;
      }

      // details corespond a la clef products details qui est un tableau contenant 5 objets marque taille etat couleur emplacement
      const details = offerToModify.product_details;
      // On itere sur chaque element du tableau donc chaque objet
      for (let i = 0; i < details.length; i++) {
        // Fonction pour valider une taille
        const isValidSize = (size) => {
          const validSizes = ["S", "M", "L", "XL"]; // Exemple de tailles valides
          return validSizes.includes(size);
        };

        for (let i = 0; i < details.length; i++) {
          // Validation pour la marque : vérifier que c'est une chaîne de caractères non vide
          // Fonction pour valider une taille
          const isValidSize = (size) => {
            const validSizes = ["S", "M", "L", "XL"]; // Exemple de tailles valides
            return validSizes.includes(size);
          };

          for (let i = 0; i < details.length; i++) {
            // Si `brand` est présent dans la requête, on valide
            if (req.body.brand) {
              if (
                typeof req.body.brand === "string" &&
                req.body.brand.trim() !== ""
              ) {
                details[i].MARQUE = req.body.brand;
              } else {
                console.log("Invalid brand value");
                return res.status(400).json({ message: "Invalid brand value" });
              }
            }

            // Si `size` est présent dans la requête, on valide
            if (req.body.size) {
              if (isValidSize(req.body.size)) {
                details[i].TAILLE = req.body.size;
              } else {
                console.log("Invalid size value");
                return res.status(400).json({ message: "Invalid size value" });
              }
            }

            // Si `condition` est présent dans la requête, on valide
            if (req.body.condition) {
              if (
                typeof req.body.condition === "string" &&
                req.body.condition.trim() !== ""
              ) {
                details[i].ÉTAT = req.body.condition;
              } else {
                console.log("Invalid condition value");
                return res
                  .status(400)
                  .json({ message: "Invalid condition value" });
              }
            }

            // Si `color` est présent dans la requête, on valide
            if (req.body.color) {
              if (
                typeof req.body.color === "string" &&
                req.body.color.trim() !== ""
              ) {
                details[i].COULEUR = req.body.color;
              } else {
                console.log("Invalid color value");
                return res.status(400).json({ message: "Invalid color value" });
              }
            }

            // Si `location` est présent dans la requête, on valide
            if (req.body.location) {
              if (
                typeof req.body.location === "string" &&
                req.body.location.trim() !== ""
              ) {
                details[i].EMPLACEMENT = req.body.location;
              } else {
                console.log("Invalid location value");
                return res
                  .status(400)
                  .json({ message: "Invalid location value" });
              }
            }
          }
        }
      }
      // Dans son modèle product_details est décrite comme étant de type Array. Or on stocke à l'intérieur un tableau d'objet. Lorsque l'on modifie un élément qui n'est pas explicitement prévu dans le modèle, le .save() ne suffit pas à sauvegardr les mofications. On doit le notifier de la sorte avant la sauvegarde afin qu'elle soit bien prise en compte. (Voir pour aller plus loin => Schemas, Models & markModified)
      offerToModify.markModified("product_details");

      // Si on reçoit une nouvelle photo
      if (req.files?.picture) {
        // On supprime l'ancienne
        await cloudinary.uploader.destroy(
          offerToModify.product_image.public_id
        );
        // On upload la nouvelle
        const result = await cloudinary.uploader.upload(
          convertToBase64(req.files.picture),
          {
            folder: `api/vinted-v2/offers/${offerToModify._id}`,
            public_id: "preview",
          }
        );
        // On remplace la clef product_image et le premier élément du tableau product_pictures
        offerToModify.product_image = result;
        offerToModify.product_pictures[0] = result;
      }
      // Sauvegarde de l'offre
      await offerToModify.save();
      res.status(200).json("Offer modified succesfully !");
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ message: error.message });
    }
  }
);

// Route pour supprimer une offre, protégée par le middleware isAuthenticated, elle prend un params
router.delete("/offer/delete/:id", isAuthenticated, async (req, res) => {
  try {
    // Je supprime ce qu'il y a dans le dossier portant le nom de l'id de l'offre sur Cloudinary
    await cloudinary.api.delete_resources_by_prefix(
      `api/vinted-v2/offers/${req.params.id}`
    );

    // Une fois le dossier vide, je peux le supprimer !
    await cloudinary.api.delete_folder(`api/vinted-v2/offers/${req.params.id}`);

    // Je vais chercher l'offre dans MongoDB et la supprimer directement
    const offerToDelete = await Offer.findByIdAndDelete(req.params.id);

    if (!offerToDelete) {
      // Si l'offre n'existe pas dans la base de données
      return res.status(404).json({ message: "Offer not found" });
    }

    res.status(200).json("Offer deleted successfully!");
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
