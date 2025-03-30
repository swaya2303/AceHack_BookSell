const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    index: true  // Add index for faster searching
  },
  author: { 
    type: String, 
    required: true,
    index: true
  },
  price: {
    type: Number,
    required: true
  },
  originalPrice: {
    type: Number
  },
  condition: {
    type: String,
    enum: ['New', 'Like New', 'Very Good', 'Good', 'Acceptable'],
    default: 'Good'
  },
  category: {
    type: String
  },
  description: {
    type: String
  },
  isbn: {
    type: String,
    index: true
  },
  publishedYear: {
    type: Number
  },
  publisher: {
    type: String
  },
  images: [String],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  availableForSale: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add text index for full-text search
bookSchema.index({ 
  title: 'text', 
  author: 'text', 
  description: 'text',
  publisher: 'text'
});

// Update the timestamp when a document is updated
bookSchema.pre('updateOne', function() {
  this.set({ updatedAt: new Date() });
});

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;