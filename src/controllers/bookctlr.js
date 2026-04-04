const Book = require('../Models/book');

// ======================
// BOOK CONTROLLERS
// ======================

// Create Book
exports.createbook = async (req, res) => {
    try {
        const {
            name, user, colid, booktitle, papertitle, proceeding,
            yop, issn, publisher, status1, comments, conferencename,
            level, type, doclink, affiliated
        } = req.body;

        const newBook = await Book.create({
            name,
            user,
            colid,
            booktitle,
            papertitle,
            proceeding,
            yop,
            issn,
            publisher,
            status1,
            comments,
            conferencename,
            level,
            type,
            doclink,
            affiliated
        });

        res.status(201).json({
            success: true,
            message: 'Book created successfully',
            data: newBook
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to create book',
        //     error: error.message
        // });
    }
};

// Get Books by User
exports.getbooksbyuser = async (req, res) => {
    try {
        const { user, colid } = req.query;

        const books = await Book.find({
            user,
            colid: parseInt(colid)
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            message: 'Books retrieved successfully',
            data: books
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to retrieve books',
        //     error: error.message
        // });
    }
};

// Update Book
exports.updatebook = async (req, res) => {
    try {
        const { id } = req.query;
        const updateData = req.body;

        const updatedBook = await Book.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedBook) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        res.json({
            success: true,
            message: 'Book updated successfully',
            data: updatedBook
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to update book',
        //     error: error.message
        // });
    }
};

// Delete Book
exports.deletebook = async (req, res) => {
    try {
        const { id } = req.query;

        const deletedBook = await Book.findByIdAndDelete(id);

        if (!deletedBook) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        res.json({
            success: true,
            message: 'Book deleted successfully',
            data: deletedBook
        });
    } catch (error) {
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to delete book',
        //     error: error.message
        // });
    }
};
