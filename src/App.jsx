import { useState, useEffect, useCallback, useRef } from 'react'
import emailjs from '@emailjs/browser'
import { FILMS, CATEGORY_ORDER, CATEGORY_LABELS } from './data/films.js'

const TOTAL = FILMS.length
const LS_WATCHED   = 'fn-watched'
const LS_SHORTLIST = 'fn-shortlist'
const LS_COLLAPSED = 'fn-collapsed'

const EJS_SERVICE  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EJS_TEMPLATE = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EJS_KEY      = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

const emailDebounce = {}
const DEBOUNCE_MS = 5000

function loadLS(key) {
  try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] }
}

function formatTimestamp() {
  return new Date().toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function sendShortlistEmail(film) {
  if (!EJS_SERVICE || !EJS_TEMPLATE || !EJS_KEY) return
  const now = Date.now()
  if (emailDebounce[film.id] && now - emailDebounce[film.id] < DEBOUNCE_MS) return
  emailDebounce[film.id] = now
  emailjs.send(EJS_SERVICE, EJS_TEMPLATE, {
    film_title: film.title,
    film_year:  String(film.year),
    category:   film.categoryLabel,
    timestamp:  formatTimestamp(),
  }, EJS_KEY).catch(err => console.error('EmailJS error:', err))
}

// ─── Film Card ───────────────────────────────────────────────────────────────

function FilmCard({ film, watched, shortlisted, onToggleWatched, onToggleShortlist, animateIndex }) {
  const [watchPulse, setWatchPulse] = useState(false)
  const [heartBloom, setHeartBloom] = useState(false)

  const handleWatched = () => {
    setWatchPulse(true)
    setTimeout(() => setWatchPulse(false), 300)
    onToggleWatched(film.id)
  }

  const handleShortlist = () => {
    if (!shortlisted) {
      setHeartBloom(true)
      setTimeout(() => setHeartBloom(false), 400)
    }
    onToggleShortlist(film.id)
  }

  const cardClass = [
    'film-card',
    watched     ? 'film-card--watched'    : '',
    shortlisted ? 'film-card--shortlisted' : '',
    animateIndex >= 0 ? 'film-card--animate' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={cardClass}
      style={animateIndex >= 0 ? { animationDelay: `${animateIndex * 35}ms` } : undefined}
    >
      <div className="film-card-top">
        <div className="film-card-meta">
          <div className="film-title">{film.title}</div>
          <div className="film-year">{film.year}</div>
        </div>
        <div className="film-card-actions">
          {/* Shortlist heart */}
          <button
            className={[
              'action-btn shortlist-btn',
              shortlisted ? 'active' : '',
              heartBloom  ? 'shortlist-btn--bloom' : '',
            ].filter(Boolean).join(' ')}
            onClick={handleShortlist}
            aria-label={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              {shortlisted
                ? <path d="M8 13.5C8 13.5 1.5 9.5 1.5 5.5C1.5 3.57 3.07 2 5 2C6.19 2 7.24 2.61 8 3.5C8.76 2.61 9.81 2 11 2C12.93 2 14.5 3.57 14.5 5.5C14.5 9.5 8 13.5 8 13.5Z" fill="currentColor"/>
                : <path d="M8 13.5C8 13.5 1.5 9.5 1.5 5.5C1.5 3.57 3.07 2 5 2C6.19 2 7.24 2.61 8 3.5C8.76 2.61 9.81 2 11 2C12.93 2 14.5 3.57 14.5 5.5C14.5 9.5 8 13.5 8 13.5Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
              }
            </svg>
          </button>
          {/* Watched circle */}
          <button
            className={[
              'action-btn watched-btn',
              watched    ? 'active' : '',
              watchPulse ? 'watched-btn--pulse' : '',
            ].filter(Boolean).join(' ')}
            onClick={handleWatched}
            aria-label={watched ? 'Mark as unwatched' : 'Mark as watched'}
          >
            {watched
              ? <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="9" fill="currentColor"/>
                  <path d="M6.5 10.25L8.75 12.5L13.5 7.5" stroke="var(--bg-deep)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              : <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.25"/>
                </svg>
            }
          </button>
        </div>
      </div>
      <div className="film-synopsis">{film.synopsis}</div>
      <div className="film-footer">
        <span className="film-tag">{film.categoryLabel}</span>
        {shortlisted && <span className="film-tag film-tag--shortlist">Shortlisted</span>}
      </div>
    </div>
  )
}

// ─── Category Section ────────────────────────────────────────────────────────

function CategorySection({ category, films, watched, shortlisted, onToggleWatched, onToggleShortlist, collapsed, onToggleCollapse, animateBaseIndex }) {
  const open = !collapsed
  const contentRef = useRef(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (contentRef.current) setHeight(contentRef.current.scrollHeight)
  }, [films.length])

  return (
    <div className="category-section">
      <div className="category-header" onClick={() => onToggleCollapse(category)}>
        <div>
          <div className="category-label">{CATEGORY_LABELS[category]}</div>
          <div className="category-count">{films.length} film{films.length !== 1 ? 's' : ''}</div>
        </div>
        <svg
          className={`category-chevron${open ? ' open' : ''}`}
          width="14" height="14" viewBox="0 0 14 14" fill="none"
        >
          <path d="M2.5 5L7 9.5L11.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div
        className={`category-films${open ? '' : ' collapsed'}`}
        style={{ maxHeight: open ? `${height || films.length * 200}px` : '0px' }}
        ref={contentRef}
      >
        {films.map((film, i) => (
          <FilmCard
            key={film.id}
            film={film}
            watched={watched.includes(film.id)}
            shortlisted={shortlisted.includes(film.id)}
            onToggleWatched={onToggleWatched}
            onToggleShortlist={onToggleShortlist}
            animateIndex={animateBaseIndex >= 0 ? animateBaseIndex + i : -1}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Pick Modal ──────────────────────────────────────────────────────────────

function PickModal({ film, shortlisted, onShortlist, onPickAgain, onClose }) {
  if (!film) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="modal-tag">{film.categoryLabel}</div>
        <div className="modal-title">{film.title}</div>
        <div className="modal-year">{film.year}</div>
        <div className="modal-synopsis">{film.synopsis}</div>
        <div className="modal-actions">
          <button
            className={`modal-btn modal-btn--shortlist${shortlisted ? ' active' : ''}`}
            onClick={() => onShortlist(film.id)}
          >
            {shortlisted ? '✓ Shortlisted' : '♥ Add to shortlist'}
          </button>
          <button className="modal-btn modal-btn--again" onClick={onPickAgain}>
            Pick again
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message }) {
  return (
    <div className={`toast${message ? ' toast--visible' : ''}`}>
      {message}
    </div>
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [query, setQuery]         = useState('')
  const [watched, setWatched]     = useState(() => loadLS(LS_WATCHED))
  const [shortlisted, setShortlisted] = useState(() => loadLS(LS_SHORTLIST))
  const [collapsed, setCollapsed] = useState(() => loadLS(LS_COLLAPSED))
  const [pickedFilm, setPickedFilm] = useState(null)
  const [toast, setToast]         = useState('')
  const toastTimerRef = useRef(null)
  const hasAnimated   = useRef(false)

  // Persist to localStorage
  useEffect(() => { localStorage.setItem(LS_WATCHED,   JSON.stringify(watched))     }, [watched])
  useEffect(() => { localStorage.setItem(LS_SHORTLIST, JSON.stringify(shortlisted)) }, [shortlisted])
  useEffect(() => { localStorage.setItem(LS_COLLAPSED, JSON.stringify(collapsed))   }, [collapsed])

  // Mark initial animation as done after first paint
  useEffect(() => { hasAnimated.current = true }, [])

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(''), 2000)
  }, [])

  const handleToggleWatched = useCallback((id) => {
    setWatched(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }, [])

  const handleToggleShortlist = useCallback((id) => {
    setShortlisted(prev => {
      const adding = !prev.includes(id)
      showToast(adding ? 'Added to shortlist' : 'Removed from shortlist')
      if (adding) {
        const film = FILMS.find(f => f.id === id)
        if (film) sendShortlistEmail(film)
      }
      return adding ? [...prev, id] : prev.filter(x => x !== id)
    })
  }, [showToast])

  const handleToggleCollapse = useCallback((cat) => {
    setCollapsed(prev =>
      prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]
    )
  }, [])

  const pickRandom = useCallback(() => {
    const pool = FILMS.filter(f => !watched.includes(f.id) && !shortlisted.includes(f.id))
    if (pool.length === 0) return
    setPickedFilm(pool[Math.floor(Math.random() * pool.length)])
  }, [watched, shortlisted])

  // Search + filter
  const isSearching = query.trim().length > 0
  const q = query.toLowerCase()

  const filmsByCategory = CATEGORY_ORDER.reduce((acc, cat) => {
    const all = FILMS.filter(f => f.category === cat)
    acc[cat] = isSearching
      ? all.filter(f =>
          f.title.toLowerCase().includes(q) ||
          f.synopsis.toLowerCase().includes(q)
        )
      : all
    return acc
  }, {})

  const matchCount = isSearching
    ? Object.values(filmsByCategory).reduce((s, arr) => s + arr.length, 0)
    : 0

  const allWatched = watched.length >= TOTAL

  // Compute stagger base indices (only on first render)
  const animateBaseIndices = {}
  if (!hasAnimated.current) {
    let i = 0
    for (const cat of CATEGORY_ORDER) {
      animateBaseIndices[cat] = i
      i += filmsByCategory[cat].length
    }
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header>
        <h1 className="app-title">Film Night</h1>
        <p className="app-subtitle">Curated by me, chosen by you.</p>
      </header>

      {/* Search */}
      <div className="search-wrap">
        <input
          className="search-input"
          type="text"
          placeholder="Search films..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {isSearching && (
          <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">
            ✕
          </button>
        )}
      </div>

      {/* Progress / match count */}
      {isSearching ? (
        <div className="progress-wrap">
          <span className="progress-text">{matchCount} result{matchCount !== 1 ? 's' : ''}</span>
        </div>
      ) : (
        <div className="progress-wrap">
          <div className="progress-stats">
            <span className="progress-text">
              {allWatched ? `All ${TOTAL} watched!` : `${watched.length} of ${TOTAL} watched`}
            </span>
            {shortlisted.length > 0 && (
              <span className="progress-text progress-text--shortlist">
                {shortlisted.length} shortlisted
              </span>
            )}
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${(watched.length / TOTAL) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Pick button */}
      {!isSearching && (
        <div className="pick-wrap">
          <button className="pick-btn" onClick={pickRandom} disabled={allWatched}>
            {allWatched ? 'All watched!' : 'Pick one for me'}
          </button>
        </div>
      )}

      {/* Categories */}
      {CATEGORY_ORDER.map(cat => {
        const films = filmsByCategory[cat]
        if (isSearching && films.length === 0) return null
        return (
          <CategorySection
            key={cat}
            category={cat}
            films={films}
            watched={watched}
            shortlisted={shortlisted}
            onToggleWatched={handleToggleWatched}
            onToggleShortlist={handleToggleShortlist}
            collapsed={collapsed.includes(cat)}
            onToggleCollapse={handleToggleCollapse}
            animateBaseIndex={animateBaseIndices[cat] ?? -1}
          />
        )
      })}

      {isSearching && matchCount === 0 && (
        <div className="empty-state">No films match that search</div>
      )}

      {/* Pick modal */}
      {pickedFilm && (
        <PickModal
          film={pickedFilm}
          shortlisted={shortlisted.includes(pickedFilm.id)}
          onShortlist={handleToggleShortlist}
          onPickAgain={pickRandom}
          onClose={() => setPickedFilm(null)}
        />
      )}

      <Toast message={toast} />
    </div>
  )
}
