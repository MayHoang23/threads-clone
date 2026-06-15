const express = require("express");
const router = express.Router();
const controller = require("./hashtag.controller");
const { optionalAuthenticate } = require("../../middlewares/auth.middleware");

// GET /api/v1/hashtags/:name/posts — bài viết theo hashtag (cursor pagination)
// optionalAuthenticate: chưa login vẫn xem được bài PUBLIC, login thì biết isLiked/isSaved
router.get("/:name/posts", optionalAuthenticate, controller.getPostsByHashtag);

module.exports = router;
