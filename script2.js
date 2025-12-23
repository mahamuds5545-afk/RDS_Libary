// ==================== FIREBASE CONFIGURATION ====================
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("📚 PDF Library Viewer Initializing...");
    
    if (!database) {
        showError("Firebase not available. Check console for errors.");
        return;
    }
    
    // Load initial data
    loadCategories();
    loadPDFs();
    
    // Setup all event listeners
    setupAllEventListeners();
});

// ==================== DATA LOADING ====================
function loadCategories() {
    console.log("📂 Loading categories...");
    
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
            console.log("⚠️ No categories found in database");
        }
        
        updateStats();
    }, (error) => {
        console.error("❌ Error loading categories:", error);
        showError("Failed to load categories from database.");
    });
}

function loadPDFs() {
    console.log("📂 Loading PDFs...");
    
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
            console.log("⚠️ No PDFs found in database");
        }
        
        filterPdfs();
        updateStats();
    }, (error) => {
        console.error("❌ Error loading PDFs:", error);
        showError("Failed to load PDFs from database.");
    });
}

// ==================== UI RENDERING ====================
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

function filterPdfs() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
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
            
            // Also search in category names
            let categoryMatch = false;
            if (pdf.categories) {
                pdf.categories.forEach(catId => {
                    const cat = categories.find(c => c.id === catId);
                    if (cat && cat.name && cat.name.toLowerCase().includes(searchTerm)) {
                        categoryMatch = true;
                    }
                });
            }
            
            return nameMatch || descMatch || categoryMatch;
        });
    }
    
    renderPDFs();
    renderPagination();
}

function renderPDFs() {
    if (currentView === 'grid') {
        renderGridView();
    } else {
        renderListView();
    }
}

function renderGridView() {
    const container = document.getElementById('pdfIconGrid');
    if (!container) return;
    
    if (filteredPdfs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-pdf"></i>
                <h3>No PDFs Found</h3>
                <p>${pdfs.length === 0 ? 'The library is empty. Add some PDFs!' : 'Try a different search or category.'}</p>
            </div>
        `;
        return;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredPdfs.length);
    const pagePdfs = filteredPdfs.slice(startIndex, endIndex);
    
    let html = '';
    pagePdfs.forEach(pdf => {
        // Get category name
        let categoryName = 'Uncategorized';
        if (pdf.categories && pdf.categories.length > 0) {
            const firstCatId = pdf.categories[0];
            const firstCategory = categories.find(cat => cat.id === firstCatId);
            if (firstCategory) {
                categoryName = firstCategory.name;
            }
        }
        
        // Truncate name
        const displayName = pdf.name && pdf.name.length > 25 
            ? pdf.name.substring(0, 25) + '...' 
            : pdf.name || 'Unnamed PDF';
        
        // File type
        const isDrive = pdf.type === 'drive';
        const fileTypeIcon = isDrive ? 'fab fa-google-drive' : 'fas fa-file-upload';
        const fileTypeClass = isDrive ? 'drive' : '';
        
        html += `
        <div class="pdf-icon-item" onclick="openPDFModal('${pdf.id}')">
            <div class="download-count">
                <i class="fas fa-download"></i> ${pdf.downloads || 0}
            </div>
            <div class="file-type ${fileTypeClass}">
                <i class="${fileTypeIcon}"></i>
            </div>
            <i class="fas fa-file-pdf"></i>
            <h4>${displayName}</h4>
            <div class="file-size">${pdf.size || 'N/A'}</div>
            <div class="category-tag" title="${categoryName}">${categoryName}</div>
        </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderListView() {
    const container = document.getElementById('pdfIconGrid');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-list"></i>
            <h3>List View Coming Soon</h3>
            <p>Currently showing grid view. List view will be available in the next update.</p>
        </div>
    `;
}

function renderPagination() {
    const pagination = document.getElementById('pagination');
    const pageNumbers = document.getElementById('pageNumbers');
    
    if (!pagination || !pageNumbers) return;
    
    if (filteredPdfs.length <= itemsPerPage) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    const totalPages = Math.ceil(filteredPdfs.length / itemsPerPage);
    
    pageNumbers.innerHTML = '';
    
    // Previous button
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    
    // Next button
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
    }
    
    // Page numbers
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
}

// ==================== MODAL FUNCTIONS ====================
function openPDFModal(pdfId) {
    const pdf = pdfs.find(p => p.id === pdfId);
    if (!pdf) {
        alert('PDF not found in database.');
        return;
    }
    
    console.log("Opening PDF:", pdf);
    
    // Update modal content
    document.getElementById('modalPdfTitle').textContent = pdf.name || 'PDF Document';
    document.getElementById('viewingPdfName').textContent = pdf.name || 'PDF Document';
    document.getElementById('pdfViewerMessage').textContent = pdf.description || 'No description available.';
    
    // Handle Google Drive link
    const driveContainer = document.getElementById('driveEmbedContainer');
    const driveLink = document.getElementById('driveViewLink');
    
    if (driveContainer && driveLink) {
        if (pdf.type === 'drive' && pdf.driveLink) {
            // Set Google Drive link
            const driveUrl = pdf.driveLink.startsWith('http') 
                ? pdf.driveLink 
                : `https://drive.google.com/file/d/${pdf.driveLink}/view`;
            
            driveLink.href = driveUrl;
            driveLink.target = '_blank';
            driveLink.innerHTML = '<i class="fab fa-google-drive"></i> View on Google Drive';
            driveContainer.style.display = 'block';
            
            console.log("Google Drive link set:", driveUrl);
            
        } else if (pdf.fileURL) {
            // Set direct file link
            driveLink.href = pdf.fileURL;
            driveLink.target = '_blank';
            driveLink.innerHTML = '<i class="fas fa-external-link-alt"></i> Open PDF File';
            driveContainer.style.display = 'block';
            
        } else {
            // Hide if no link available
            driveContainer.style.display = 'none';
            console.log("No link available for this PDF");
        }
    }
    
    // Set download button
    const downloadBtn = document.getElementById('downloadPdfBtn');
    if (downloadBtn) {
        downloadBtn.onclick = function() {
            downloadPDF(pdfId);
            // Close modal after download
            document.getElementById('pdfViewerModal').classList.remove('active');
        };
    }
    
    // Show modal
    document.getElementById('pdfViewerModal').classList.add('active');
}

async function downloadPDF(pdfId) {
    const pdf = pdfs.find(p => p.id === pdfId);
    if (!pdf) {
        alert('PDF not found.');
        return;
    }
    
    try {
        // Increment download count
        const newDownloads = (pdf.downloads || 0) + 1;
        
        // Update in Firebase
        await database.ref('pdfs/' + pdfId).update({ 
            downloads: newDownloads,
            lastDownloaded: new Date().toISOString()
        });
        
        // Open the PDF
        if (pdf.type === 'drive' && pdf.driveLink) {
            const driveUrl = pdf.driveLink.startsWith('http') 
                ? pdf.driveLink 
                : `https://drive.google.com/file/d/${pdf.driveLink}/view`;
            
            window.open(driveUrl, '_blank');
            alert(`Opening "${pdf.name}" on Google Drive...`);
            
        } else if (pdf.fileURL) {
            window.open(pdf.fileURL, '_blank');
            alert(`Downloading "${pdf.name}"...`);
            
        } else {
            alert(`PDF: ${pdf.name}\n\nNo direct download link available.`);
        }
        
        // Update local data
        pdf.downloads = newDownloads;
        updateStats();
        filterPdfs();
        
    } catch (error) {
        console.error('Download error:', error);
        alert('Failed to download PDF. Please try again.');
    }
}

function updateStats() {
    const totalPdfsElem = document.getElementById('totalPdfs');
    if (totalPdfsElem) totalPdfsElem.textContent = pdfs.length;
    
    const totalCategoriesElem = document.getElementById('totalCategories');
    if (totalCategoriesElem) totalCategoriesElem.textContent = categories.length;
    
    const totalDownloadsElem = document.getElementById('totalDownloads');
    if (totalDownloadsElem) {
        let totalDownloads = 0;
        pdfs.forEach(pdf => {
            totalDownloads += pdf.downloads || 0;
        });
        totalDownloadsElem.textContent = totalDownloads;
    }
}

// ==================== EVENT LISTENERS ====================
function setupAllEventListeners() {
    console.log("🔧 Setting up event listeners...");
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentPage = 1;
            filterPdfs();
        });
    }
    
    // Category dropdown
    const dropdownHeader = document.getElementById('dropdownHeader');
    const dropdown = document.getElementById('categoriesDropdown');
    const dropdownArrow = document.getElementById('dropdownArrow');
    
    if (dropdownHeader && dropdown) {
        dropdownHeader.addEventListener('click', () => {
            dropdown.classList.toggle('active');
            if (dropdownArrow) {
                dropdownArrow.style.transform = dropdown.classList.contains('active') 
                    ? 'rotate(180deg)' 
                    : 'rotate(0deg)';
            }
        });
        
        dropdown.addEventListener('click', (e) => {
            if (e.target.classList.contains('dropdown-item')) {
                const category = e.target.getAttribute('data-category');
                
                // Update active state
                document.querySelectorAll('.dropdown-item').forEach(item => {
                    item.classList.remove('active');
                });
                e.target.classList.add('active');
                
                // Update selected text
                const selectedText = document.getElementById('selectedCategory');
                if (selectedText) {
                    if (category === 'all') {
                        selectedText.textContent = 'All Categories';
                    } else {
                        const cat = categories.find(c => c.id === category);
                        selectedText.textContent = cat ? cat.name : 'All Categories';
                    }
                }
                
                // Update filter
                currentCategory = category;
                currentPage = 1;
                filterPdfs();
                
                // Close dropdown
                dropdown.classList.remove('active');
                if (dropdownArrow) {
                    dropdownArrow.style.transform = 'rotate(0deg)';
                }
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdownHeader.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
                if (dropdownArrow) {
                    dropdownArrow.style.transform = 'rotate(0deg)';
                }
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
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderPDFs();
                renderPagination();
            }
        });
    }
    
    const nextBtn = document.getElementById('nextBtn');
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
    const closeModalBtn = document.getElementById('closeViewerModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
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
            alert('Print feature will be implemented in the next update.');
        });
    }
    
    // Test Google Drive link
    const driveLink = document.getElementById('driveViewLink');
    if (driveLink) {
        driveLink.addEventListener('click', function(e) {
            if (!this.href || this.href === '#' || this.href.includes('undefined')) {
                e.preventDefault();
                alert('No valid link available for this PDF.');
            } else {
                console.log("Opening link:", this.href);
                // Link will open normally in new tab
            }
        });
    }
}

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

// ==================== GLOBAL FUNCTIONS ====================
window.openPDFModal = openPDFModal;
window.downloadPDF = downloadPDF;

// Test functions
window.testFirebase = function() {
    console.log("Testing Firebase connection...");
    
    database.ref('.info/connected').once('value')
        .then(snapshot => {
            if (snapshot.val() === true) {
                console.log("✅ Firebase is connected!");
                alert("Firebase connection is working!");
            } else {
                console.log("❌ Firebase is not connected");
                alert("Firebase is not connected.");
            }
        })
        .catch(error => {
            console.error("Firebase test error:", error);
            alert("Firebase test failed: " + error.message);
        });
};

// Add sample data
window.addSampleData = function() {
    console.log("Adding sample data...");
    
    // Sample categories
    const categoriesData = {
        "cat1": { name: "Technology", color: "blue" },
        "cat2": { name: "Business", color: "green" },
        "cat3": { name: "Education", color: "orange" },
        "cat4": { name: "Science", color: "purple" }
    };
    
    // Sample PDFs
    const pdfsData = {
        "pdf1": {
            name: "Web Development Guide",
            description: "Complete guide to modern web development",
            categories: ["cat1", "cat3"],
            type: "drive",
            driveLink: "https://drive.google.com/file/d/1sQqP9ZQmQeDn7jK8lLmN9oP0qR1sT2uV/view",
            size: "3.2 MB",
            uploadDate: "2023-12-01",
            downloads: 45
        },
        "pdf2": {
            name: "Business Strategy Template",
            description: "Professional business strategy templates",
            categories: ["cat2"],
            type: "file",
            fileURL: "https://example.com/business-strategy.pdf",
            size: "2.1 MB",
            uploadDate: "2023-11-20",
            downloads: 32
        },
        "pdf3": {
            name: "Machine Learning Basics",
            description: "Introduction to machine learning concepts",
            categories: ["cat1", "cat4"],
            type: "drive",
            driveLink: "https://drive.google.com/file/d/2aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV/view",
            size: "4.5 MB",
            uploadDate: "2023-11-15",
            downloads: 28
        }
    };
    
    // Add categories
    database.ref('categories').set(categoriesData)
        .then(() => {
            console.log("✅ Categories added");
            // Add PDFs
            return database.ref('pdfs').set(pdfsData);
        })
        .then(() => {
            console.log("✅ PDFs added");
            alert("Sample data added successfully! Refresh the page to see changes.");
        })
        .catch(error => {
            console.error("❌ Error adding sample data:", error);
            alert("Failed to add sample data: " + error.message);
        });
};

console.log("🎯 PDF Library Viewer script loaded!");
