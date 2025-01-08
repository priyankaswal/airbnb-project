const fs = require("fs");

exports.deleteFile = (filePath) => {
  // Check if the file exists before attempting to delete it
  fs.exists(filePath, (exists) => {
    if (exists) {
      fs.unlink(filePath, (err) => {
        if (err) {
          throw err; // Handle error if unlink fails
        }
        console.log('File deleted successfully');
      });
    } else {
      console.log('File does not exist');
    }
  });
};
