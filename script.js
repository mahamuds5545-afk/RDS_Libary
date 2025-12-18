// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDm-pq9lsbn5KASjtbeOrdIdyXdc9WgRoQ",
    authDomain: "rds-library.firebaseapp.com",
    databaseURL: "https://rds-library-default-rtdb.firebaseio.com",
    projectId: "rds-library",
    storageBucket: "rds-library.firebasestorage.app",
    messagingSenderId: "1043493423342",
    appId: "1:1043493423342:web:d4675d2a7c35fe21798bff",
    measurementId: "G-7C712Z0WJ9"
};

// Initialize Firebase
let database;
try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log("✅ Firebase initialized successfully!");
} catch (error) {
    console.error("❌ Firebase initialization failed:", error);
    showError("Failed to initialize Firebase. Please refresh the page.");
}

// Global variables
let categories = [];
let pdfs = [];
let filteredPdfs = [];
let currentCategory = 'all';
let currentView = 'grid';
let currentPage = 1;
const itemsPerPage = 15;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log("📚 PDF Library Viewer Loading...");
    
    // Initialize Firebase
    if (!database) {
        showError("Firebase not available. Check console for errors.");
        return;
    }
    
    // Load data
    loadCategories();
    loadPDFs();
    
    // Setup event listeners
    setupEventListeners();
});

// Load categories from Firebase
function loadCategories() {
    console.log("Loading categories...");
    
    database.ref('categories').on('value', (snapshot) => {
        categories = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                categories.push({
                    id: child.key,
                    ...child.val()
                });
            });
            console.log(`✅ Loaded ${categories.length} categories`);
            renderCategoriesDropdown();
        } else {
            console.log("⚠️ No categories found");
        }
        
        updateStats();
    }, (error) => {
        console.error("❌ Error loading categories:", error);
        showError("Failed to load categories.");
    });
}

// Load PDFs from Firebase
function loadPDFs() {
    console.log("Loading PDFs...");
    
    database.ref('pdfs').on('value', (snapshot) => {
        pdfs = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                pdfs.push({
                    id: child.key,
                    ...child.val()
                });
            });
            console.log(`✅ Loaded ${pdfs.length} PDFs`);
        } else {
            console.log("⚠️ No PDFs found");
        }
        
        filterPdfs();
        updateStats();
    }, (error) => {
        console.error("❌ Error loading PDFs:", error);
        showError("Failed to load PDFs.");
    });
}

// Render categories dropdown
function renderCategoriesDropdown() {
    const dropdown = document.getElementById('categoriesDropdown');
    if (!dropdown) return;
    
    dropdown.innerHTML = '<div class="dropdown-item active" data-category="all">All Categories</div>';
    
    categories.forEach(category => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.setAttribute('data-category', category.id);
        item.textContent = category.name;
        dropdown.appendChild(item);
    });
}

// Filter PDFs based on search and category
function filterPdfs() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    // Start with all PDFs
    filteredPdfs = [...pdfs];
    
    // Filter by category
    if (currentCategory !== 'all') {
        filteredPdfs = filteredPdfs.filter(pdf => 
            pdf.categories && pdf.categories.includes(currentCategory)
        );
    }
    
    // Filter by search term
    if (searchTerm) {
        filteredPdfs = filteredPdfs.filter(pdf => {
            const nameMatch = pdf.name && pdf.name.toLowerCase().includes(searchTerm);
            const descMatch = pdf.description && pdf.description.toLowerCase().includes(searchTerm);
            return nameMatch || descMatch;
        });
    }
    
    renderPDFs();
    renderPagination();
}

// Render PDFs based on current view
function renderPDFs() {
    if (currentView === 'grid') {
        renderGrid();
    } else {
        renderList();
    }
}

// Render grid view
function renderGrid() {
    const container = document.getElementById('pdfIconGrid');
    if (!container) return;
    
    // Show loading if no PDFs
    if (filteredPdfs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-pdf"></i>
                <h3>No PDFs Found</h3>
                <p>${pdfs.length === 0 ? 'No PDFs in library' : 'Try different search or category'}</p>
            </div>
        `;
        return;
    }
    
    // Calculate items for current page
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredPdfs.length);
    const pagePdfs = filteredPdfs.slice(startIndex, endIndex);
    
    // Generate HTML
    let html = '';
    pagePdfs.forEach(pdf => {
        // Get category name
        let categoryName = 'Uncategorized';
        if (pdf.categories && pdf.categories.length > 0) {
            const firstCategory = categories.find(cat => cat.id === pdf.categories[0]);
            if (firstCategory) {
                categoryName = firstCategory.name;
            }
        }
        
        // Truncate name if too long
        const displayName = pdf.name && pdf.name.length > 30 
            ? pdf.name.substring(0, 30) + '...' 
            : pdf.name || 'Unnamed PDF';
        
        // File type icon
        const fileTypeIcon = pdf.type === 'drive' ? 'fab fa-google-drive' : 'fas fa-file-upload';
        const fileTypeClass = pdf.type === 'drive' ? 'drive' : '';
        
        html += `
        <div class="pdf-icon-item" onclick="openPDF('${pdf.id}')">
            <div class="download-count">
                <i class="fas fa-download"></i> ${pdf.downloads || 0}
            </div>
            <div class="file-type ${fileTypeClass}">
                <i class="${fileTypeIcon}"></i>
            </div>
            <i class="fas fa-file-pdf"></i>
            <h4>${displayName}</h4>
            <div class="file-size">${pdf.size || 'N/A'}</div>
            <div class="category-tag">${categoryName}</div>
        </div>
        `;
    });
    
    container.innerHTML = html;
}

// Render list view (simplified for now)
function renderList() {
    const container = document.getElementById('pdfIconGrid');
    if (!container) return;
    
    container.innerHTML = '<div class="empty-state"><p>List view will be implemented soon</p></div>';
}

// Render pagination
function renderPagination() {
    const pagination = document.getElementById('pagination');
    const pageNumbers = document.getElementById('pageNumbers');
    
    if (!pagination || !pageNumbers) return;
    
    // Hide pagination if not needed
    if (filteredPdfs.length <= itemsPerPage) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    
    // Calculate total pages
    const totalPages = Math.ceil(filteredPdfs.length / itemsPerPage);
    
    // Clear existing page numbers
    pageNumbers.innerHTML = '';
    
    // Add page numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageNum = document.createElement('div');
        pageNum.className = `page-number ${i === currentPage ? 'active' : ''}`;
        pageNum.textContent = i;
        pageNum.onclick = () => {
            currentPage = i;
            renderPDFs();
            renderPagination();
        };
        pageNumbers.appendChild(pageNum);
    }
    
    // Update button states
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;
}

// Update statistics
function updateStats() {
    // Update total PDFs
    const totalPdfsElem = document.getElementById('totalPdfs');
    if (totalPdfsElem) {
        totalPdfsElem.textContent = pdfs.length;
    }
    
    // Update total categories
    const totalCategoriesElem = document.getElementById('totalCategories');
    if (totalCategoriesElem) {
        totalCategoriesElem.textContent = categories.length;
    }
    
    // Update total downloads
    const totalDownloadsElem = document.getElementById('totalDownloads');
    if (totalDownloadsElem) {
        let totalDownloads = 0;
        pdfs.forEach(pdf => {
            totalDownloads += pdf.downloads || 0;
        });
        totalDownloadsElem.textContent = totalDownloads;
    }
}

// Open PDF modal
function openPDF(pdfId) {
    const pdf = pdfs.find(p => p.id === pdfId);
    if (!pdf) {
        alert('PDF not found');
        return;
    }
    
    // Update modal content
    document.getElementById('modalPdfTitle').textContent = pdf.name || 'PDF Document';
    document.getElementById('viewingPdfName').textContent = pdf.name || 'PDF Document';
    document.getElementById('pdfViewerMessage').textContent = pdf.description || 'No description available';
    
    // Set download link
    const downloadBtn = document.getElementById('downloadPdfBtn');
    downloadBtn.onclick = () => downloadPDF(pdfId);
    
    // Show modal
    document.getElementById('pdfViewerModal').classList.add('active');
}

// Download PDF
async function downloadPDF(pdfId) {
    const pdf = pdfs.find(p => p.id === pdfId);
    if (!pdf) {
        alert('PDF not found');
        return;
    }
    
    try {
        // Update download count
        const newDownloads = (pdf.downloads || 0) + 1;
        await database.ref('pdfs/' + pdfId).update({ 
            downloads: newDownloads 
        });
        
        // Open PDF link
        if (pdf.driveLink) {
            window.open(pdf.driveLink, '_blank');
        } else if (pdf.fileURL) {
            window.open(pdf.fileURL, '_blank');
        } else {
            alert(`PDF: ${pdf.name}\nLink not available`);
        }
        
        // Update local data
        pdf.downloads = newDownloads;
        updateStats();
        filterPdfs();
        
    } catch (error) {
        console.error('Download error:', error);
        alert('Failed to download PDF');
    }
}

// Setup event listeners
function setupEventListeners() {
    console.log("Setting up event listeners...");
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterPdfs);
    }
    
    // Category dropdown
    const dropdownHeader = document.getElementById('dropdownHeader');
    const dropdown = document.getElementById('categoriesDropdown');
    const dropdownArrow = document.getElementById('dropdownArrow');
    
    if (dropdownHeader && dropdown) {
        dropdownHeader.addEventListener('click', () => {
            dropdown.classList.toggle('active');
            dropdownArrow.style.transform = dropdown.classList.contains('active') 
                ? 'rotate(180deg)' 
                : 'rotate(0deg)';
        });
        
        dropdown.addEventListener('click', (e) => {
            if (e.target.classList.contains('dropdown-item')) {
                const category = e.target.getAttribute('data-category');
                
                // Update UI
                document.querySelectorAll('.dropdown-item').forEach(item => {
                    item.classList.remove('active');
                });
                e.target.classList.add('active');
                
                // Update selected category text
                const selectedCatText = document.getElementById('selectedCategory');
                if (selectedCatText) {
                    if (category === 'all') {
                        selectedCatText.textContent = 'All Categories';
                    } else {
                        const cat = categories.find(c => c.id === category);
                        selectedCatText.textContent = cat ? cat.name : 'All Categories';
                    }
                }
                
                // Update filter
                currentCategory = category;
                currentPage = 1;
                filterPdfs();
                
                // Close dropdown
                dropdown.classList.remove('active');
                dropdownArrow.style.transform = 'rotate(0deg)';
            }
        });
    }
    
    // View toggle buttons
    const gridBtn = document.getElementById('gridViewBtn');
    const listBtn = document.getElementById('listViewBtn');
    
    if (gridBtn && listBtn) {
        gridBtn.addEventListener('click', () => {
            if (currentView !== 'grid') {
                currentView = 'grid';
                gridBtn.classList.add('active');
                listBtn.classList.remove('active');
                renderPDFs();
            }
        });
        
        listBtn.addEventListener('click', () => {
            if (currentView !== 'list') {
                currentView = 'list';
                listBtn.classList.add('active');
                gridBtn.classList.remove('active');
                renderPDFs();
            }
        });
    }
    
    // Pagination buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderPDFs();
                renderPagination();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredPdfs.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderPDFs();
                renderPagination();
            }
        });
    }
    
    // Modal close button
    const closeModal = document.getElementById('closeViewerModal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('pdfViewerModal').classList.remove('active');
        });
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('pdfViewerModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }
    
    // Print button
    const printBtn = document.getElementById('printPdfBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            alert('Print functionality would be implemented here');
        });
    }
}

// Show error message
function showError(message) {
    const container = document.getElementById('pdfIconGrid');
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle" style="color: #ff6b6b;"></i>
                <h3>Error</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 20px;">
                    <i class="fas fa-redo"></i> Reload Page
                </button>
            </div>
        `;
    }
}

// Make functions available globally
window.openPDF = openPDF;
window.downloadPDF = downloadPDF;

// Test Firebase connection
window.testConnection = function() {
    console.log("Testing Firebase connection...");
    
    database.ref('.info/connected').once('value')
        .then(snapshot => {
            if (snapshot.val() === true) {
                console.log("✅ Firebase connected!");
                alert("Firebase is connected!");
            } else {
                console.log("❌ Firebase disconnected");
                alert("Firebase is disconnected!");
            }
        })
        .catch(error => {
            console.error("❌ Connection test failed:", error);
            alert("Connection test failed!");
        });
};

// Add sample data function
window.addSampleData = async function() {
    console.log("Adding sample data...");
    
    try {
        // Add sample categories
        const categoriesRef = database.ref('categories');
        const sampleCategories = [
            { name: "Technology", color: "blue" },
            { name: "Business", color: "green" },
            { name: "Education", color: "orange" },
            { name: "Science", color: "purple" }
        ];
        
        for (const cat of sampleCategories) {
            await categoriesRef.push().set(cat);
        }
        
        // Add sample PDFs
        const pdfsRef = database.ref('pdfs');
        const samplePDFs = [
            {
                name: "Introduction to Web Development",
                description: "Learn HTML, CSS and JavaScript basics",
                categories: ["-cat1", "-cat3"],
                type: "drive",
                driveLink: "https://drive.google.com/file/d/1/view",
                size: "2.5 MB",
                uploadDate: "2023-12-01",
                downloads: 25
            },
            {
                name: "Business Plan Template",
                description: "Complete business plan template",
                categories: ["-cat2"],
                type: "file",
                fileURL: "https://example.com/business-plan.pdf",
                size: "1.8 MB",
                uploadDate: "2023-11-15",
                downloads: 42
            },
            {
                name: "Python Programming Guide",
                description: "Python programming for beginners",
                categories: ["-cat1", "-cat3"],
                type: "drive",
                driveLink: "https://drive.google.com/file/d/2/view",
                size: "3.2 MB",
                uploadDate: "2023-11-20",
                downloads: 18
            }
        ];
        
        for (const pdf of samplePDFs) {
            await pdfsRef.push().set(pdf);
        }
        
        console.log("✅ Sample data added successfully!");
        alert("Sample data added! Refresh to see changes.");
        
    } catch (error) {
        console.error("❌ Error adding sample data:", error);
        alert("Failed to add sample data: " + error.message);
    }
};

// Initialize when page loads
console.log("Script loaded successfully!");
