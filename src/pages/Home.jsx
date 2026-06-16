import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Library, BookOpen, MessageCircle, Search, Filter, ArrowUpDown, Loader2 } from 'lucide-react';
import { getAvailableBooks } from '../services/db';
import { BOOK_GENRES } from '../utils/constants';

export default function Home() {
  const { currentUser, isDemoMode } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBookId, setExpandedBookId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Filter and sort logic
  const filteredBooks = books.filter(book => {
    const searchLower = searchQuery.toLowerCase();
    const titleMatch = book.title?.toLowerCase().includes(searchLower);
    const authorMatch = book.author?.toLowerCase().includes(searchLower);
    const matchesSearch = !searchQuery || titleMatch || authorMatch;
    
    const matchesGenre = selectedGenre ? book.genre === selectedGenre : true;
    
    return matchesSearch && matchesGenre;
  }).sort((a, b) => {
    if (sortBy === 'title-asc') return a.title.localeCompare(b.title, 'he');
    if (sortBy === 'title-desc') return b.title.localeCompare(a.title, 'he');
    if (sortBy === 'author-asc') return a.author.localeCompare(b.author, 'he');
    // Default to newest
    const dateA = a.createdAt?.seconds || Date.parse(a.createdAt) || 0;
    const dateB = b.createdAt?.seconds || Date.parse(b.createdAt) || 0;
    return dateB - dateA;
  });

  useEffect(() => {
    async function fetchBooks() {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      const timeoutId = setTimeout(() => setLoading(false), 3000);
      
      try {
        const availableBooks = await getAvailableBooks();
        
        // Group books by ISBN or Title+Author
        const grouped = Object.values(availableBooks.reduce((acc, book) => {
          const normalize = (str) => (str || '').toLowerCase().replace(/[^a-z0-9א-ת]/g, '');
          let key;
          if (book.isbn && book.isbn.length >= 10) {
            key = `isbn_${book.isbn}`;
          } else {
            key = `title_${normalize(book.title)}_author_${normalize(book.author)}`;
          }

          if (!acc[key]) {
            acc[key] = {
              id: key,
              title: book.title,
              author: book.author,
              genre: book.genre,
              coverImage: book.coverImage,
              addedAt: book.addedAt,
              owners: []
            };
          }
          
          acc[key].owners.push({
            bookId: book.id,
            ownerId: book.ownerId,
            ownerName: book.ownerName,
            ownerPhone: book.ownerPhone,
            isMine: currentUser && book.ownerId === currentUser.uid
          });

          if (!acc[key].coverImage && book.coverImage) {
            acc[key].coverImage = book.coverImage;
          }

          return acc;
        }, {}));

        setBooks(grouped);
      } catch (error) {
        console.error("Failed to fetch books:", error);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }
    fetchBooks();
  }, [currentUser]);

  const handleWhatsappClick = (owner, bookTitle, e) => {
    e.preventDefault();
    const text = encodeURIComponent(`היי ${owner.ownerName}! 👋 ראיתי את הספר "${bookTitle}" בספריית ניר עוז וממש אשמח להשאיל אותו אם אפשר. תודה מראש! 📚✨`);
    if (!owner.ownerPhone) {
      alert(`למשתמש ${owner.ownerName} אין מספר טלפון רשום במערכת.\nההודעה מוכנה - בחלון שיפתח בוואטסאפ תוכל לחפש את ${owner.ownerName} ולשלוח אליו/אליה.`);
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    } else {
      const phone = owner.ownerPhone.replace(/\D/g, '').replace(/^0/, '972');
      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${text}`, '_blank');
    }
  };

  return (
    <div className="animate-fade-in">
      {isDemoMode && (
        <div className="glass-card mb-4" style={{ borderColor: 'var(--warning-color)', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
          <p className="text-center" style={{ color: 'var(--warning-color)', fontWeight: 600 }}>
            שימו לב: האפליקציה רצה במצב הדגמה (Demo) כיוון ש-Firebase לא הוגדר. מידע ישמר באופן מקומי בלבד.
          </p>
        </div>
      )}

      <div className="text-center mb-6 mt-4">
        <h1 className="mb-4" style={{ fontSize: '2.5rem' }}>הספרים בקהילה</h1>

      </div>

      <div className="flex justify-center w-full mb-10">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          background: 'var(--surface-color)', 
          borderRadius: '100px', 
          border: '1px solid var(--surface-border)', 
          padding: '0.3rem 0.8rem', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          gap: '0.5rem',
          flexWrap: 'wrap',
          maxWidth: '850px',
          width: '100%'
        }}>
          
          <div style={{ flex: '2 1 200px', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', right: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="חיפוש חופשי..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                width: '100%', border: 'none', background: 'transparent', outline: 'none', 
                padding: '0.5rem 2.2rem 0.5rem 0.5rem', fontSize: '1rem', color: 'var(--text-main)' 
              }}
            />
          </div>
          
          <div style={{ width: '1px', height: '24px', background: 'var(--surface-border)', margin: '0 0.5rem' }} className="hidden-mobile"></div>
          
          <div style={{ flex: '1 1 120px', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Filter size={16} style={{ position: 'absolute', right: '8px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <select 
              value={selectedGenre} 
              onChange={(e) => setSelectedGenre(e.target.value)} 
              style={{ 
                width: '100%', border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer',
                padding: '0.5rem 0.5rem 0.5rem 1.8rem', textIndent: '1.5rem', fontSize: '1rem', color: 'var(--text-main)', appearance: 'none'
              }}
            >
              <option value="">כל הקטגוריות</option>
              {BOOK_GENRES.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--surface-border)', margin: '0 0.5rem' }} className="hidden-mobile"></div>

          <div style={{ flex: '1 1 120px', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <ArrowUpDown size={16} style={{ position: 'absolute', right: '8px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)} 
              style={{ 
                width: '100%', border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer',
                padding: '0.5rem 0.5rem 0.5rem 1.8rem', textIndent: '1.5rem', fontSize: '1rem', color: 'var(--text-main)', appearance: 'none'
              }}
            >
              <option value="newest">הכי חדשים</option>
              <option value="title-asc">א-ת (ספר)</option>
              <option value="title-desc">ת-א (ספר)</option>
              <option value="author-asc">א-ת (סופר)</option>
            </select>
          </div>
          
        </div>
      </div>

      {!currentUser ? (
        <div className="glass-card text-center hover-lift" style={{ padding: '4rem 2rem', maxWidth: '600px', margin: '0 auto' }}>
          <Library size={64} style={{ color: 'var(--primary-color)', margin: '0 auto 1rem', opacity: 0.8 }} />
          <h2>התחברו כדי לצפות ולהשאיל ספרים</h2>
          <p className="text-muted mt-2">התחברו עם חשבון הגוגל שלכם בלחיצת כפתור אחת למעלה ותתחילו להשאיל!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="text-center" style={{ gridColumn: '1 / -1', padding: '2rem' }}>
              <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: 'var(--primary-color)' }} />
              <p>טוען מאגר ספרים...</p>
            </div>
          ) : books.length === 0 ? (
            <div className="glass-card text-center hover-lift" style={{ gridColumn: '1 / -1', padding: '4rem 2rem' }}>
               <BookOpen size={64} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', opacity: 0.5 }} />
               <h3>אין ספרים זמינים כרגע</h3>
               <p className="text-muted mt-2">היו הראשונים להוסיף ספר לספרייה!</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="glass-card text-center" style={{ gridColumn: '1 / -1', padding: '4rem 2rem' }}>
              <h3>לא נמצאו ספרים תואמים לחיפוש שלך</h3>
              <button className="btn btn-secondary mt-4" onClick={() => { setSearchQuery(''); setSelectedGenre(''); }}>נקה סינונים</button>
            </div>
          ) : (
            filteredBooks.map(book => {
              const isMine = book.owners.some(o => o.isMine);
              return (
              <div key={book.id} className="glass-card flex" style={{ 
                padding: '0', 
                overflow: 'hidden', 
                flexDirection: 'row',
                alignItems: 'stretch',
                position: 'relative',
                border: isMine ? '2px solid var(--primary-color)' : '',
                boxShadow: isMine ? '0 8px 30px rgba(99, 102, 241, 0.2)' : ''
              }}>
                {isMine && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'var(--primary-color)',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    zIndex: 10,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(4px)'
                  }}>
                    יש לי עותק
                  </div>
                )}
                
                <div className="flex-col justify-between flex" style={{ padding: '0.25rem 1rem 1rem 1rem', flex: 1 }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', paddingRight: isMine ? '85px' : '0' }}>{book.title}</h4>
                    <p className="text-muted" style={{ fontSize: '1rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>{book.author}</p>
                    <p style={{ fontSize: '1rem', color: 'var(--primary-color)', fontWeight: '600' }}>{book.genre}</p>
                  </div>
                  <div className="mt-4 pt-4 flex flex-col justify-between" style={{ borderTop: '1px solid var(--surface-border)', gap: '0.5rem' }}>
                    {book.owners.length === 1 ? (
                      <>
                        <p style={{ fontSize: '0.95rem', color: book.owners[0].isMine ? 'var(--primary-color)' : 'var(--text-muted)', fontWeight: book.owners[0].isMine ? 'bold' : 'normal' }}>
                          שייך ל: <strong>{book.owners[0].isMine ? 'אני' : book.owners[0].ownerName}</strong>
                        </p>
                        {!book.owners[0].isMine && (
                          <button onClick={(e) => handleWhatsappClick(book.owners[0], book.title, e)} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', gap: '0.4rem', background: '#25D366', borderColor: '#25D366', alignSelf: 'flex-start' }} title="שלח וואטסאפ">
                            <MessageCircle size={16} /> בקש בוואטסאפ
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <p style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--primary-color)', margin: 0 }}>
                            {book.owners.length} עותקים זמינים
                          </p>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}
                            onClick={() => setExpandedBookId(expandedBookId === book.id ? null : book.id)}
                          >
                            {expandedBookId === book.id ? 'הסתר רשימה' : 'למי יש?'}
                          </button>
                        </div>
                        {expandedBookId === book.id && (
                          <div className="flex flex-col gap-2 p-3 mt-1" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                            {book.owners.map((owner, idx) => (
                              <div key={owner.bookId} className="flex justify-between items-center" style={{ paddingBottom: idx < book.owners.length - 1 ? '0.5rem' : 0, borderBottom: idx < book.owners.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: owner.isMine ? 'bold' : 'normal', color: owner.isMine ? 'var(--primary-color)' : 'inherit' }}>
                                  {owner.isMine ? 'אני' : owner.ownerName}
                                </span>
                                {!owner.isMine && (
                                  <button onClick={(e) => handleWhatsappClick(owner, book.title, e)} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', gap: '0.25rem', background: '#25D366', borderColor: '#25D366', fontSize: '0.8rem' }} title="שלח וואטסאפ">
                                    <MessageCircle size={14} /> וואטסאפ
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {book.coverImage && (
                  <div style={{ width: '120px', flexShrink: 0, background: '#f8fafc', borderRight: '1px solid var(--surface-border)' }}>
                    <img src={book.coverImage} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
