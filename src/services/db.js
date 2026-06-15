import { db, storage, hasFirebaseConfig } from '../firebase';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// In-memory mock DB for demo mode
let mockBooks = [
  { id: '1', title: 'קיצור תולדות האנושות', author: 'יובל נח הררי', genre: 'היסטוריה / מדע', coverImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=300&h=400', status: 'available', ownerId: 'demo-user-123', ownerName: 'אורח (Demo)' },
  { id: '2', title: 'הארי פוטר ואבן החכמים', author: 'ג׳יי. קיי. רולינג', genre: 'פנטזיה', coverImage: 'https://images.unsplash.com/photo-1626618012641-bfbca5a31239?auto=format&fit=crop&q=80&w=300&h=400', status: 'borrowed', borrowerName: 'דנה ישראלי', dueDate: '14.06.2026', ownerId: 'demo-user-123', ownerName: 'אורח (Demo)' }
];

const mockUsers = [
  { uid: 'u1', displayName: 'דנה ישראלי' },
  { uid: 'u2', displayName: 'אורי כהן' },
  { uid: 'u3', displayName: 'יעל לוי' },
  { uid: 'u4', displayName: 'עידו שפירא' },
  { uid: 'u5', displayName: 'שירה אלון' }
];

export async function getAllUsers() {
  if (!hasFirebaseConfig) return mockUsers;
  const q = query(collection(db, 'users'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data());
}

export async function getUserProfile(uid) {
  if (!hasFirebaseConfig) return mockUsers.find(u => u.uid === uid) || null;
  const docRef = doc(db, 'users', uid);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(uid, data) {
  if (!hasFirebaseConfig) return;
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, data);
}

export async function saveUserToDb(user) {
  if (!hasFirebaseConfig) return;
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    lastLogin: serverTimestamp()
  }, { merge: true });
}

export async function getUserBooks(userId) {
  if (!hasFirebaseConfig) return mockBooks.filter(b => b.ownerId === userId);
  
  const q = query(collection(db, 'books'), where('ownerId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAvailableBooks() {
  if (!hasFirebaseConfig) return mockBooks.filter(b => b.status === 'available');

  const q = query(collection(db, 'books'), where('status', '==', 'available'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllBooksAdmin() {
  if (!hasFirebaseConfig) return [...mockBooks];
  
  const q = query(collection(db, 'books'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function searchBookByIsbn(isbn) {
  if (!hasFirebaseConfig) {
    return mockBooks.find(b => b.isbn === isbn) || null;
  }
  const q = query(collection(db, 'books'), where('isbn', '==', isbn));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return snapshot.docs[0].data();
  }
  return null;
}

export async function addBook(bookData, userProfile) {
  const newBook = {
    ...bookData,
    ownerId: userProfile.uid,
    ownerName: userProfile.displayName,
    ownerPhone: userProfile.phone || '',
    status: 'available',
    createdAt: hasFirebaseConfig ? serverTimestamp() : new Date()
  };

  if (!hasFirebaseConfig) {
    newBook.id = Date.now().toString();
    mockBooks.push(newBook);
    return newBook;
  }

  const docRef = await addDoc(collection(db, 'books'), newBook);
  return { id: docRef.id, ...newBook };
}

export async function deleteBook(bookId) {
  if (!hasFirebaseConfig) {
    mockBooks = mockBooks.filter(b => b.id !== bookId);
    return;
  }
  await deleteDoc(doc(db, 'books', bookId));
}

export async function editBook(bookId, updatedData) {
  if (!hasFirebaseConfig) {
    mockBooks = mockBooks.map(b => b.id === bookId ? { ...b, ...updatedData } : b);
    return;
  }
  await updateDoc(doc(db, 'books', bookId), updatedData);
}

export async function lendBook(bookId, borrowerName, dueDateStr) {
  if (!hasFirebaseConfig) {
    mockBooks = mockBooks.map(b => b.id === bookId ? { ...b, status: 'borrowed', borrowerName, dueDate: dueDateStr } : b);
    return;
  }
  await updateDoc(doc(db, 'books', bookId), {
    status: 'borrowed',
    borrowerName,
    dueDate: dueDateStr
  });
}

export async function returnBook(bookId) {
  if (!hasFirebaseConfig) {
    mockBooks = mockBooks.map(b => b.id === bookId ? { ...b, status: 'available', borrowerName: null, dueDate: null } : b);
    return;
  }
  await updateDoc(doc(db, 'books', bookId), {
    status: 'available',
    borrowerName: null,
    dueDate: null
  });
}

export async function updateCatalogMetadata(catalogKey, isIsbn, updatedData) {
  if (!hasFirebaseConfig) {
    if (isIsbn) {
      mockBooks = mockBooks.map(b => b.isbn === catalogKey ? { ...b, ...updatedData } : b);
    } else {
      mockBooks = mockBooks.map(b => b.id === catalogKey ? { ...b, ...updatedData } : b);
    }
    return;
  }

  try {
    if (isIsbn) {
      const q = query(collection(db, 'books'), where('isbn', '==', catalogKey));
      const snapshot = await getDocs(q);
      const updatePromises = snapshot.docs.map(docSnap => updateDoc(docSnap.ref, updatedData));
      await Promise.all(updatePromises);
    } else {
      await updateDoc(doc(db, 'books', catalogKey), updatedData);
    }
  } catch (err) {
    console.error("Error updating catalog metadata:", err);
    throw err;
  }
}

export async function uploadBookCover(file, bookId) {
  if (!hasFirebaseConfig || !storage) return null;
  const fileExtension = file.name.split('.').pop();
  const storageRef = ref(storage, `bookCovers/${bookId}_${Date.now()}.${fileExtension}`);
  
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}
