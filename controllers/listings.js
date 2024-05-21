const Listing = require("../models/listing");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index = async (req,res) =>{
    let allListings = await Listing.find({});
    res.render("listings/index.ejs" , {allListings});
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
    .populate({path :"reviews",
     populate: {
        path: "author"
      },
    })
    .populate("owner");
    if(!listing){
      req.flash("error", "Listing you requested for does not exist!");
      res.redirect("/listings");
    }
    res.render("listings/show.ejs", { listing });
  };

module.exports.createListing = async (req, res ,next) => {

  let response = await geocodingClient.forwardGeocode({
    query: req.body.listing.location,
    limit: 1,
  })
    .send();

    let url = req.file.path;
    let filename = req.file.filename;

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = {url, filename};

    newListing.geometry = response.body.features[0].geometry;

    let savedListing = await newListing.save();
    console.log(savedListing);
    
    req.flash("success", "New Listing Created!");
    
    res.redirect("/listings");

};

module.exports.renderEditForm = async(req,res) =>{
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if(!listing){
      req.flash("error", "Listing you requested for does not exist!");
      res.redirect("/listings");
    }

    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");

    res.render("listings/edit.ejs", {listing, originalImageUrl});
};

module.exports.updateListing = async (req, res) => {

  let { id } = req.params;
  let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

  if(typeof req.file !== "undefined"){
    let url = req.file.path;
    let filename = req.file.filename;

    listing.image = {url, filename};
    await listing.save();
  }
  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
};

//filter Listing
module.exports.filterListings = async (req, res, next) => {
  const { q } = req.params;
  const filteredListings = await Listing.find({category: q }).exec();
  if (!filteredListings.length) {
      req.flash("error", "No Listings exists for this filter!");
      res.redirect("/listings");
      return;
  }
  res.locals.success = `Listings Filtered by ${q}`;
  res.render("listings/index.ejs", { allListings: filteredListings });
}

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success", "Listing Deleted!");
    
    res.redirect("/listings");
};


module.exports.search = async (req, res) => {
  console.log(req.query);
  const { query } = req.query;
  if (!query) {
    // return res.status(400).send("No search query provided");
    req.flash("error", "Search value empty!!!");
    res.redirect("/listings");
  }
  try {
    const allListings = await Listing.find({
        $or: [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
            { location: { $regex: query, $options: "i" } }
        ]
    });
    res.render("listings/index.ejs", { allListings ,query});
} catch (err) {
    res.status(500).send(err.message);
}
}