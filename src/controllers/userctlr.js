const User = require("../Models/user");

exports.updateuserphoto = async(req, res) =>{
    try {
    const { email, colid, photo } = req.body;
    
    const updatedUser = await User.findOneAndUpdate(
      { email, colid },
      { photo },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile photo updated successfully',
      data: updatedUser
    });
  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to update profile photo',
    //   error: error.message
    // });
  }
}