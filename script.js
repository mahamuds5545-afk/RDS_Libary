// ==================== EVENT LISTENERS ====================
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
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully!");
} catch (error) {
    console.error("Firebase initialization error:", error);
}

const database = firebase.database();
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', filterPdfs);
    
    // Clear search on escape
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            filterPdfs();
        }
    });
    
    // Categories dropdown
    const dropdownHeader = document.getElementById('dropdownHeader');
    const dropdownContent = document.getElementById('categoriesDropdown');
    const dropdownArrow = document.getElementById('dropdownArrow');
    
    dropdownHeader.addEventListener('click', () => {
        dropdownContent.classList.toggle('active');
        dropdownArrow.style.transform = dropdownContent.classList.contains('active') 
            ? 'rotate(180deg)' 
            : 'rotate(0deg)';
    });
    
    // Handle category selection
    dropdownContent.addEventListener('click', (e) => {
        if (e.target.classList.contains('dropdown-item')) {
            const category = e.target.getAttribute('data-category');
            currentCategory = category;
            
            // Update selected category text
            if (category === 'all') {
                document.getElementById('selectedCategory').textContent = 'All Categories';
            } else {
                const selectedCat = categories.find(cat => cat.id === category);
                document.getElementById('selectedCategory').textContent = selectedCat ? selectedCat.name : 'All Categories';
            }
            
            // Update active class
            document.querySelectorAll('.dropdown-item').forEach(item => {
                item.classList.remove('active');
            });
            e.target.classList.add('active');
            
            // Close dropdown
            dropdownContent.classList.remove('active');
            dropdownArrow.style.transform = 'rotate(0deg)';
            
            // Filter PDFs
            filterPdfs();
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdownHeader.contains(e.target) && !dropdownContent.contains(e.target)) {
            dropdownContent.classList.remove('active');
            dropdownArrow.style.transform = 'rotate(0deg)';
        }
    });
    
    // View toggle buttons
    document.getElementById('gridViewBtn').addEventListener('click', () => {
        if (currentView !== 'grid') {
            currentView = 'grid';
            document.getElementById('gridViewBtn').classList.add('active');
            document.getElementById('listViewBtn').classList.remove('active');
            renderViewerContent();
        }
    });
    
    document.getElementById('listViewBtn').addEventListener('click', () => {
        if (currentView !== 'list') {
            currentView = 'list';
            document.getElementById('listViewBtn').classList.add('active');
            document.getElementById('gridViewBtn').classList.remove('active');
            renderViewerContent();
        }
    });
    
    // Pagination buttons
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderViewerContent();
            renderPagination();
        }
    });
    
    document.getElementById('nextBtn').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredPdfs.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderViewerContent();
            renderPagination();
        }
    });
    
    // Modal close button
    document.getElementById('closeViewerModal').addEventListener('click', () => {
        document.getElementById('pdfViewerModal').classList.remove('active');
    });
    
    // Download button in modal
    document.getElementById('downloadPdfBtn').addEventListener('click', () => {
        if (currentPdfId) {
            downloadPdf(currentPdfId);
            document.getElementById('pdfViewerModal').classList.remove('active');
        }
    });
    
    // Print button in modal
    document.getElementById('printPdfBtn').addEventListener('click', () => {
        alert('Print functionality would open print dialog for the PDF.');
    });
    
    // Close modal when clicking outside
    document.getElementById('pdfViewerModal').addEventListener('click', (e) => {
        if (e.target.id === 'pdfViewerModal') {
            document.getElementById('pdfViewerModal').classList.remove('active');
        }
    });
}
