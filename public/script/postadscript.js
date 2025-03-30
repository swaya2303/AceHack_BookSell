document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const bookForm = document.getElementById('book-form');
    const manuallyRadio = document.getElementById('manually');
    const automaticallyRadio = document.getElementById('automatically');
    const isbnGroup = document.querySelector('.isbn-group');
    const manualFields = document.querySelectorAll('.manual-fields');
    const getBookBtn = document.getElementById('getbook');
    const isbnInput = document.getElementById('isbn');
    const priceInput = document.getElementById('price');
    const shippingInput = document.getElementById('shipping_charges');
    const freeShippingCheckbox = document.getElementById('free_shipping');
    const earningsSpan = document.querySelector('.earn_money');
    const optionalDetailsBtn = document.getElementById('optional-details-btn');
    const collapsibleContent = document.querySelector('.collapsible-content');
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const imagePreview = document.getElementById('image-preview');
    const paymentModeRadios = document.querySelectorAll('input[name="payment_mode"]');
    const paymentMsg = document.querySelector('.payment-msg');
    const accountBtn = document.getElementById('account-btn');
    const overlay = document.getElementById('overlay');
    const profileBtn = document.querySelector('.profile-btn');
    
    // Modals
    const isbnModal = document.getElementById('isbn-modal');
    const loginModal = document.getElementById('login-modal');
    const closeButtons = document.querySelectorAll('.close-btn');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const isbnSelectBookBtn = document.getElementById('isbn-select-book');
    const enterDetailsManuallyBtn = document.getElementById('enter-details-manually');
    
    // Toggle between manual and automatic book details entry
    manuallyRadio.addEventListener('change', function() {
      if (this.checked) {
        isbnGroup.style.display = 'none';
        manualFields.forEach(field => field.style.display = 'block');
      }
    });
    
    automaticallyRadio.addEventListener('change', function() {
      if (this.checked) {
        isbnGroup.style.display = 'block';
        manualFields.forEach(field => field.style.display = 'none');
      }
    });
    
    // Optional details collapsible
    optionalDetailsBtn.addEventListener('click', function() {
      this.classList.toggle('active');
      if (this.classList.contains('active')) {
        collapsibleContent.style.maxHeight = collapsibleContent.scrollHeight + 'px';
      } else {
        collapsibleContent.style.maxHeight = '0';
      }
    });
    
    // File upload handling
    uploadArea.addEventListener('click', function() {
      fileInput.click();
    });
    
    fileInput.addEventListener('change', function() {
      handleFiles(this.files);
    });
    
    function handleFiles(files) {
      if (!files.length) return;
      
      imagePreview.innerHTML = '';
      
      for (let i = 0; i < files.length; i++) {
        if (i >= 4) break; // Limit to 4 images
        
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
          const previewItem = document.createElement('div');
          previewItem.className = 'preview-item';
          
          const img = document.createElement('img');
          img.src = e.target.result;
          
          const removeBtn = document.createElement('span');
          removeBtn.className = 'remove-image';
          removeBtn.innerHTML = '×';
          removeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            previewItem.remove();
          });
          
          previewItem.appendChild(img);
          previewItem.appendChild(removeBtn);
          imagePreview.appendChild(previewItem);
        };
        
        reader.readAsDataURL(file);
      }
    }
    
    // Payment mode selection
    paymentModeRadios.forEach(radio => {
      radio.addEventListener('change', function() {
        if (this.checked) {
          const mode = this.value === 'upi' ? 'UPI Number' : 'Bank Account';
          paymentMsg.textContent = `We'll ask you for your ${mode} details once you receive an order for this book.`;
          paymentMsg.style.display = 'block';
        }
      });
    });
    
    // Calculate earnings when price or shipping changes
    function calculateEarnings() {
      const price = parseFloat(priceInput.value) || 0;
      const shipping = freeShippingCheckbox.checked ? 0 : (parseFloat(shippingInput.value) || 0);
      
      // Simple calculation for demo purposes
      // In real implementation, this would call the server API
      const convenienceFee = Math.round(price * 0.05); // 5% fee
      const earnings = price + shipping - convenienceFee;
      
      earningsSpan.textContent = earnings > 0 ? earnings : '0';
    }
    
    priceInput.addEventListener('input', calculateEarnings);
    shippingInput.addEventListener('input', calculateEarnings);
    freeShippingCheckbox.addEventListener('change', function() {
      if (this.checked) {
        shippingInput.disabled = true;
        shippingInput.value = '';
      } else {
        shippingInput.disabled = false;
      }
      calculateEarnings();
    });
    
    // Get book details from ISBN
    getBookBtn.addEventListener('click', function() {
      const isbn = isbnInput.value.trim();
      
      if (isbn.length !== 13) {
        alert('Please enter a valid 13 digit ISBN number');
        return;
      }
      
      // Simulate API call with mock data
      // In real implementation, this would call the server API
      setTimeout(() => {
        const mockData = {
          title: 'The Great Gatsby',
          authors: 'F. Scott Fitzgerald',
          edition: '2020',
          publisher: 'Penguin Classics',
          description: 'A classic novel about the American Dream set in the Jazz Age.',
          cover_photo: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=387&q=80'
        };
        
        // Fill modal with book details
        document.querySelector('.isbn-number').textContent = isbn;
        document.querySelector('.isbn-title').textContent = mockData.title;
        document.querySelector('.isbn-authors').textContent = mockData.authors;
        document.querySelector('.isbn-edition').textContent = mockData.edition;
        document.querySelector('.isbn-publisher').textContent = mockData.publisher;
        document.querySelector('.isbn-description').textContent = mockData.description;
        document.querySelector('.isbn-cover-photo').src = mockData.cover_photo;
        
        // Show modal
        isbnModal.style.display = 'block';
        overlay.style.display = 'block';
      }, 1000);
    });
    
    // ISBN modal actions
    isbnSelectBookBtn.addEventListener('click', function() {
      const title = document.querySelector('.isbn-title').textContent;
      const author = document.querySelector('.isbn-authors').textContent;
      const edition = document.querySelector('.isbn-edition').textContent;
      const description = document.querySelector('.isbn-description').textContent;
      
      // Fill form with selected book details
      document.getElementById('title').value = title;
      document.getElementById('author').value = author;
      document.getElementById('edition').value = edition;
      document.getElementById('description').value = description;
      
      // Close modal
      isbnModal.style.display = 'none';
      overlay.style.display = 'none';
    });
    
    enterDetailsManuallyBtn.addEventListener('click', function() {
      manuallyRadio.checked = true;
      manuallyRadio.dispatchEvent(new Event('change'));
      
      // Close modal
      isbnModal.style.display = 'none';
      overlay.style.display = 'none';
    });
    
    // Account button opens login modal
    accountBtn.addEventListener('click', function(e) {
      e.preventDefault();
      loginModal.style.display = 'block';
      overlay.style.display = 'block';
    });
    
    // Close modals
    closeButtons.forEach(button => {
      button.addEventListener('click', function() {
        isbnModal.style.display = 'none';
        loginModal.style.display = 'none';
        overlay.style.display = 'none';
      });
    });
    
    overlay.addEventListener('click', function() {
      isbnModal.style.display = 'none';
      loginModal.style.display = 'none';
      overlay.style.display = 'none';
    });
    
    // Tab switching in login modal
    tabButtons.forEach(button => {
      button.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');
        
        // Update active tab button
        tabButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        // Show selected tab content
        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
      });
    });
    
    // Form submission
    // bookForm.addEventListener('submit', function(e) {
    //   e.preventDefault();
      
    //   // Validate form
    //   let isValid = true;
      
    //   if (!document.getElementById('title').value) {
    //     alert('Please enter an ad title');
    //     isValid = false;
    //   } else if (!document.getElementById('book-type').value) {
    //     alert('Please select a book type');
    //     isValid = false;
    //   } else if (!document.querySelector('input[name="book_condition"]:checked')) {
    //     alert('Please select a book condition');
    //     isValid = false;
    //   } else if (!document.getElementById('price').value) {
    //     alert('Please enter a price');
    //     isValid = false;
    //   }
      
    //   if (isValid) {
    //     alert('Your book has been posted successfully!');
    //     // In real implementation, this would submit the form to the server
    //     // bookForm.submit();
    //   }
    // });
    

    app.post('/post-ad', isAuthenticated, upload.array('adimage[]', 4), async (req, res) => {
      try {
          const client = await connectToDatabase();
          const database = client.db(ADS_DATABASE);
          const collection = database.collection(ADS_COLLECTION);
          
          const formData = req.body;
          const imagePaths = req.files.map((file) => file.path);
  
          const adData = {
              ...formData,
              images: imagePaths,
              userId: new ObjectId(req.session.userId)
          };
  
          const result = await collection.insertOne(adData);
  
          if (!result.acknowledged) {
              throw new Error("MongoDB insert failed");
          }
  
          res.json({ message: "✅ Your ad has been posted successfully!" });
          // res.send('<h1>Ad Submitted Successfully</h1>');
      } catch (error) {
          console.error("Error saving ad:", error);
          res.status(500).send('Error saving ad to database');
      }
  });
  
  

    // Form submission
    bookForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validate form
        let isValid = true;

        if (!document.getElementById('title').value) {
            alert('Please enter an ad title');
            isValid = false;
        } else if (!document.getElementById('book-type').value) {
            alert('Please select a book type');
            isValid = false;
        } else if (!document.querySelector('input[name="book_condition"]:checked')) {
            alert('Please select a book condition');
            isValid = false;
        } else if (!document.getElementById('price').value) {
            alert('Please enter a price');
            isValid = false;
        }

        if (isValid) {
            try {
                const formData = new FormData(bookForm);
                const response = await fetch('/post-ad', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    alert(result.message);
                    window.location.href = "/index.html"; // Redirect to homepage
                } else {
                    alert(result.error);
                }
            } catch (error) {
                console.error('Error submitting ad:', error);
                alert('An error occurred while submitting your ad. Please try again.');
            }
        }
    });

    // Initialize
    calculateEarnings();
    
    // Simulate ISBN lookup functionality
    isbnInput.addEventListener('input', async function() {
      const isbn = this.value.trim();
      
      if (isbn.length === 13) {
        try {
          // In a real implementation, this would be an actual API call
          // const response = await fetch(`/api/books/${isbn}`);
          // const data = await response.json();
          
          // For demo purposes, we'll just simulate a successful response
          setTimeout(() => {
            console.log(`Looking up ISBN: ${isbn}`);
          }, 500);
        } catch (error) {
          console.error('Error fetching book details:', error);
        }
      }
    });
  });

  const btn = document.querySelector('.profile-btn');
btn.addEventListener('click', () => {
    const dropDown = document.querySelector('.dropdown-content');
    dropDown.classList.toggle('show');
});