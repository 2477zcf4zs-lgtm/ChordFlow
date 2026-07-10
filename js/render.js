// render.js — chord dictionary data, renderChordStructure/updatePlaybackState, voicing panel,
// piano SVG, dictionary panel, and substitution menu rendering.
    // ============================================
    // CHORD DICTIONARY DATA
    // ============================================
    
    const CHORD_CATEGORIES = {
      triads: ['maj', 'min', 'dim', 'aug', 'sus4', 'sus2'],
      seventh: ['maj7', 'min7', 'dom7', 'dim7', 'm7b5', 'minMaj7', 'dom7sus4'],
      extended: ['maj9', 'min9', 'dom9', 'dom11', 'min11', 'maj13', 'dom13', 'min13', 'add9', 'madd9', '6', 'm6', '69'],
      altered: ['dom7b9', 'dom7s9', 'dom7b5', 'dom7s5', 'dom7s11', 'dom7b13', 'dom7alt', 'dom9b5', 'dom9s5', 'dom13b9', 'dom13s11']
    };
    
    const CHORD_FORMULAS = {
      maj: '1 - 3 - 5',
      min: '1 - ♭3 - 5',
      dim: '1 - ♭3 - ♭5',
      aug: '1 - 3 - ♯5',
      sus4: '1 - 4 - 5',
      sus2: '1 - 2 - 5',
      maj7: '1 - 3 - 5 - 7',
      min7: '1 - ♭3 - 5 - ♭7',
      dom7: '1 - 3 - 5 - ♭7',
      dim7: '1 - ♭3 - ♭5 - ♭♭7',
      m7b5: '1 - ♭3 - ♭5 - ♭7',
      minMaj7: '1 - ♭3 - 5 - 7',
      dom7sus4: '1 - 4 - 5 - ♭7',
      maj9: '1 - 3 - 5 - 7 - 9',
      min9: '1 - ♭3 - 5 - ♭7 - 9',
      dom9: '1 - 3 - 5 - ♭7 - 9',
      dom11: '1 - 3 - 5 - ♭7 - 9 - 11',
      min11: '1 - ♭3 - 5 - ♭7 - 9 - 11',
      maj13: '1 - 3 - 5 - 7 - 9 - 13',
      dom13: '1 - 3 - 5 - ♭7 - 9 - 13',
      min13: '1 - ♭3 - 5 - ♭7 - 9 - 13',
      add9: '1 - 3 - 5 - 9',
      madd9: '1 - ♭3 - 5 - 9',
      '6': '1 - 3 - 5 - 6',
      'm6': '1 - ♭3 - 5 - 6',
      '69': '1 - 3 - 5 - 6 - 9',
      dom7b9: '1 - 3 - 5 - ♭7 - ♭9',
      dom7s9: '1 - 3 - 5 - ♭7 - ♯9',
      dom7b5: '1 - 3 - ♭5 - ♭7',
      dom7s5: '1 - 3 - ♯5 - ♭7',
      dom7s11: '1 - 3 - 5 - ♭7 - ♯11',
      dom7b13: '1 - 3 - 5 - ♭7 - ♭13',
      dom7alt: '1 - 3 - ♯5 - ♭7 - ♭9',
      dom9b5: '1 - 3 - ♭5 - ♭7 - 9',
      dom9s5: '1 - 3 - ♯5 - ♭7 - 9',
      dom13b9: '1 - 3 - 5 - ♭7 - ♭9 - 13',
      dom13s11: '1 - 3 - 5 - ♭7 - 9 - ♯11 - 13'
    };

    /**
     * Voice Leading System (pitch-aware)
     *
     * Voicings are realized as actual pitches (MIDI numbers), not just pitch
     * classes. Voicing choice and octave placement for the whole progression
     * are optimized together with a small dynamic program that minimizes:
     *   - real voice movement between consecutive right-hand voicings
     *   - drift away from the practical comping register (around middle C)
     *
     * Type A / Type B alternation is not enforced with bonuses; it emerges
     * naturally from minimizing movement in real pitch space, which is why
     * jazz pianists alternate voicing types around the circle of fifths.
     */

    // ============================================
    // RENDERING FUNCTIONS
    // ============================================

    /**
     * Build the chord boxes. Called only when the progression itself changes
     * (buildProgressionFromSource, applySubstitution, the empty-state path, and
     * a Beats/Chord change that alters the dot count). Every box carries its
     * full beat-indicator (beatsPerChord dots) and its sub-badge up front, so
     * per-beat playback updates never add or remove nodes — they only toggle
     * classes (see updatePlaybackState). Click handling is delegated once on
     * the container in setupEventListeners(), so no per-node listeners here.
     */
    function renderChordStructure() {
      const { progression, beatsPerChord } = state;

      if (progression.length === 0) {
        elements.chordContainer.innerHTML =
          '<div class="chord-cell"><div class="chord-box chord-box--static"><div class="chord-symbol">—</div></div></div>';
        updatePlaybackState();
        return;
      }

      let html = '';
      progression.forEach((chord, index) => {
        const symbol = formatChordSymbol(chord.root, chord.quality);

        let dots = '';
        for (let b = 0; b < beatsPerChord; b++) dots += '<div class="beat-dot"></div>';

        // Compute the sub badge once here, not per beat. It's hidden during
        // playback via the container's .is-playing class rather than by
        // re-rendering, so the expensive getChordSubstitutions call happens
        // only on structural changes.
        let badge = '';
        const subs = getChordSubstitutions(chord.root, chord.quality);
        if (subs.length > 0) {
          badge = `<button class="sub-badge" type="button" data-chord-index="${index}" title="Substitute this chord" aria-label="Show substitutions for chord ${index + 1}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 1l4 4-4 4"/>
                  <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                  <path d="M7 23l-4-4 4-4"/>
                  <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                </svg>
                <span>Sub</span>
              </button>`;
        }

        const marker = chord.substituted ? '<span class="sub-marker" title="Substituted">sub</span>' : '';

        html += `
          <div class="chord-cell" data-index="${index}">
            <button class="chord-box" type="button" data-index="${index}" aria-label="Chord ${index + 1}, ${symbol}. Activate to view its voicing.">
              <div class="chord-numeral">${chord.degree}${marker}</div>
              <div class="chord-symbol">${symbol}</div>
              <div class="beat-indicator">${dots}</div>
            </button>
            <div class="sub-badge-container">${badge}</div>
          </div>
        `;
      });

      elements.chordContainer.innerHTML = html;
      updatePlaybackState();
    }

    /**
     * Update only the transient playback/selection state by toggling classes on
     * the existing chord nodes — no innerHTML writes. Because the nodes persist,
     * the .chord-box.active CSS transition actually animates, and an open
     * substitution menu inside the container is never destroyed mid-interaction.
     */
    function updatePlaybackState() {
      const { progression, currentChordIndex, currentBeat, isPlaying, showVoicing } = state;
      elements.chordContainer.classList.toggle('is-playing', isPlaying);
      if (progression.length === 0) return;

      const selectedIdx = state.selectedChordIndex !== null ? state.selectedChordIndex : currentChordIndex;

      elements.chordContainer.querySelectorAll('.chord-cell').forEach(cell => {
        const index = parseInt(cell.dataset.index);
        const box = cell.querySelector('.chord-box');
        if (!box) return;

        const isActive = isPlaying && index === currentChordIndex;
        box.classList.toggle('active', isActive);
        box.classList.toggle('past', isPlaying && index < currentChordIndex);
        box.classList.toggle('future', isPlaying && index > currentChordIndex);
        box.classList.toggle('selected', index === selectedIdx && showVoicing);

        const dots = box.querySelectorAll('.beat-dot');
        if (isActive) {
          dots.forEach((d, b) => d.classList.toggle('active', b <= currentBeat));
        } else {
          dots.forEach(d => d.classList.remove('active'));
        }
      });
    }
    
    function selectChord(index) {
      // If clicking the same chord again, cycle to a new voicing
      if (state.selectedChordIndex === index) {
        // Cycle to the next voicing for this chord
        const chord = state.progression[index];
        // Cycle only within the voicings the current tier actually offers
        const tierVoicings = voicingsFor(chord.quality, state.complexity);
        if (tierVoicings.length > 1) {
          const currentIdx = state.voicingIndices[index] || 0;
          const nextIdx = (currentIdx + 1) % tierVoicings.length;
          state.voicingIndices[index] = nextIdx;
          // Re-anchor the new voicing: connect smoothly from the previous chord
          let prevRh = null;
          if (index > 0 && state.voicingIndices[index - 1] !== undefined) {
            const prevChord = state.progression[index - 1];
            const prevVoicings = voicingsFor(prevChord.quality, state.complexity);
            const pv = prevVoicings[state.voicingIndices[index - 1] % prevVoicings.length];
            const pShift = (state.voicingShifts && state.voicingShifts[index - 1]) || 0;
            prevRh = realizeHand(prevChord.root, pv.right, RH_BASE + pShift).map(n => n.midi);
          }
          state.voicingShifts[index] = bestShiftForVoicing(chord.root, tierVoicings[nextIdx], prevRh);
        }
        renderVoicing();
      } else {
        state.selectedChordIndex = index;
      }
      
      // Show voicing panel if not visible
      if (!state.showVoicing) {
        toggleVoicingPanel(true);
      } else {
        renderVoicing();
      }
      
      updatePlaybackState();
    }
    
    function showSubstitutionMenu(chordIndex, badgeElement) {
      const chord = state.progression[chordIndex];
      const subs = getChordSubstitutions(chord.root, chord.quality);
      
      // Remove any existing menu
      const existingMenu = document.querySelector('.sub-menu');
      if (existingMenu) existingMenu.remove();
      
      // Create popup menu
      const menu = document.createElement('div');
      menu.className = 'sub-menu';
      menu.style.cssText = `
        position: absolute;
        background: var(--bg-elevated);
        border: 1px solid var(--accent-coral);
        border-radius: 12px;
        padding: 8px;
        z-index: 100;
        min-width: 160px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      `;
      
      let menuHtml = '<div style="font-size: 0.7rem; color: var(--text-muted); padding: 4px 8px; text-transform: uppercase; letter-spacing: 0.1em;">Substitute with:</div>';
      
      subs.forEach((sub, i) => {
        menuHtml += `
          <div class="sub-menu-item" data-sub-index="${i}" style="
            padding: 8px 12px;
            cursor: pointer;
            border-radius: 6px;
            transition: background 0.15s;
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <span style="font-family: 'JetBrains Mono', monospace; color: var(--text-primary);">${sub.symbol}</span>
            <span style="font-size: 0.7rem; color: var(--text-secondary);">${sub.description}</span>
          </div>
        `;
      });
      
      menu.innerHTML = menuHtml;
      
      // Position menu near the badge
      const rect = badgeElement.getBoundingClientRect();
      const containerRect = elements.chordContainer.getBoundingClientRect();
      menu.style.left = `${rect.left - containerRect.left}px`;
      menu.style.top = `${rect.bottom - containerRect.top + 8}px`;
      
      elements.chordContainer.style.position = 'relative';
      elements.chordContainer.appendChild(menu);
      
      // Add hover effects and click handlers
      menu.querySelectorAll('.sub-menu-item').forEach((item, i) => {
        item.addEventListener('mouseenter', () => {
          item.style.background = 'rgba(212, 91, 91, 0.15)';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = 'transparent';
        });
        item.addEventListener('click', () => {
          applySubstitution(chordIndex, subs[i]);
          menu.remove();
        });
      });
      
      // Close menu when clicking outside
      const closeMenu = (e) => {
        if (!menu.contains(e.target) && !badgeElement.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      };
      setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }
    
    function applySubstitution(chordIndex, sub) {
      // Replace the chord, keeping the original degree label clean and marking
      // the substitution with a structured flag (not a '*' baked into the
      // degree string, which stacked to '**' and broke any re-read of degree).
      state.progression[chordIndex] = {
        root: sub.root,
        quality: sub.quality,
        degree: state.progression[chordIndex].degree,
        substituted: true
      };
      // Remember which substitution rule was applied so it can be re-derived
      // (transposed) if the key or complexity changes.
      state.substitutions[chordIndex] = sub.type;
      
      // The harmony changed: re-optimize voicings around the new chord
      recomputeProgressionVoicings();
      
      renderChordStructure();
      
      // Update voicing if this chord is selected
      if (state.selectedChordIndex === chordIndex || state.currentChordIndex === chordIndex) {
        renderVoicing();
      }
    }

    function updateProgress() {
      const { currentChordIndex, progression, loopCount } = state;
      const progress = ((currentChordIndex + 1) / progression.length) * 100;
      elements.progressFill.style.width = `${progress}%`;
      elements.currentMeasure.textContent = `Measure ${currentChordIndex + 1} of ${progression.length}`;
      elements.loopCount.textContent = `Loop: ${loopCount}`;
    }

    function updateStatus() {
      elements.statusDot.className = 'status-dot' + (state.isPlaying ? ' playing' : (state.progression.length ? ' paused' : ''));
      elements.statusText.textContent = state.isPlaying ? 'Playing' : (state.progression.length ? 'Paused' : 'Ready');
    }

    /**
     * Format a note name for display (unicode accidentals).
     */
    /**
     * Render an SVG piano keyboard with the current voicing highlighted.
     * Left-hand notes in coral, right-hand notes in blue. Range spans C2
     * upward, extending by whole octaves if a voicing exceeds C6.
     */
    function renderPianoKeyboard(leftPitches, rightPitches) {
      const container = document.getElementById('pianoKeyboard');
      if (!container) return;

      const WK_W = 20, WK_H = 96, BK_W = 12, BK_H = 60;
      const WHITE_PCS = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };
      const BLACK_LEFT_WHITE = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };

      const highlights = new Map();
      (leftPitches || []).forEach(p => highlights.set(p.midi, { hand: 'L', name: p.name }));
      (rightPitches || []).forEach(p => highlights.set(p.midi, { hand: 'R', name: p.name }));

      const LOW = 36; // C2
      let high = 84;  // C6, extended upward in octaves if needed
      for (const m of highlights.keys()) {
        while (m > high) high += 12;
      }

      const whiteX = (m) => {
        const oct = Math.floor((m - LOW) / 12);
        return (oct * 7 + WHITE_PCS[m % 12]) * WK_W;
      };

      let whites = '', blacks = '', labels = '';
      for (let m = LOW; m <= high; m++) {
        const pc = m % 12;
        const h = highlights.get(m);
        if (pc in WHITE_PCS) {
          const x = whiteX(m);
          const fill = h ? (h.hand === 'L' ? 'var(--accent-coral)' : 'var(--accent-blue)') : '#ece9e2';
          whites += `<rect x="${x}" y="0" width="${WK_W}" height="${WK_H}" rx="2" style="fill:${fill}" stroke="#141418" stroke-width="1"/>`;
          if (h) {
            labels += `<text x="${x + WK_W / 2}" y="${WK_H - 8}" text-anchor="middle" font-size="9" font-weight="700" style="fill:#141418">${formatNoteDisplay(h.name)}</text>`;
          } else if (pc === 0) {
            labels += `<text x="${x + WK_W / 2}" y="${WK_H - 6}" text-anchor="middle" font-size="7.5" style="fill:#9a9a9a">C${Math.floor(m / 12) - 1}</text>`;
          }
        } else {
          const oct = Math.floor((m - LOW) / 12);
          const x = (oct * 7 + BLACK_LEFT_WHITE[pc] + 1) * WK_W - BK_W / 2;
          const fill = h ? (h.hand === 'L' ? 'var(--accent-coral)' : 'var(--accent-blue)') : '#222228';
          blacks += `<rect x="${x}" y="0" width="${BK_W}" height="${BK_H}" rx="2" style="fill:${fill}" stroke="#0d0d0f" stroke-width="1"/>`;
          if (h) {
            blacks += `<text x="${x + BK_W / 2}" y="${BK_H - 7}" text-anchor="middle" font-size="8" font-weight="700" style="fill:#f5f5f0">${formatNoteDisplay(h.name)}</text>`;
          }
        }
      }

      const totalW = ((high - LOW) / 12 * 7 + 1) * WK_W;
      container.innerHTML = `<svg viewBox="0 0 ${totalW} ${WK_H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Piano keyboard showing the current voicing">${whites}${blacks}${labels}</svg>`;
    }

    function renderVoicing() {
      const leftHandEl = document.getElementById('leftHandNotes');
      const rightHandEl = document.getElementById('rightHandNotes');
      const chordNameEl = document.getElementById('voicingChordName');
      const subsEl = document.getElementById('voicingSubs');
      
      // Use selected chord if set, otherwise current chord
      const chordIndex = state.selectedChordIndex !== null ? state.selectedChordIndex : state.currentChordIndex;
      
      if (state.progression.length === 0 || chordIndex >= state.progression.length) {
        leftHandEl.textContent = '—';
        rightHandEl.textContent = '—';
        chordNameEl.textContent = '—';
        subsEl.innerHTML = '';
        elements.voicingDescription.textContent = 'No chord selected';
        renderPianoKeyboard([], []);
        return;
      }

      const chord = state.progression[chordIndex];
      
      // Use the pre-computed voicing index if available, otherwise calculate
      let chordData;
      if (state.voicingIndices && state.voicingIndices[chordIndex] !== undefined) {
        const shift = state.voicingShifts ? state.voicingShifts[chordIndex] : undefined;
        chordData = getChordNotesAtIndex(chord.root, chord.quality, state.complexity, state.voicingIndices[chordIndex], shift);
      } else {
        chordData = getChordNotes(chord.root, chord.quality, state.complexity);
        if (state.voicingIndices) {
          state.voicingIndices[chordIndex] = chordData.voicingIndex || 0;
          if (state.voicingShifts) state.voicingShifts[chordIndex] = chordData.octaveShift || 0;
        }
      }
      
      // Show realized pitches low-to-high with octave numbers (C4 = middle C)
      const formatPitch = (p) => formatNoteDisplay(p.name) + p.octave;
      const leftNotes = chordData.leftHandPitches.map(formatPitch).join('  ');
      const rightNotes = chordData.rightHandPitches.map(formatPitch).join('  ');
      
      leftHandEl.textContent = leftNotes;
      rightHandEl.textContent = rightNotes;
      
      // Draw the voicing on the piano
      renderPianoKeyboard(chordData.leftHandPitches, chordData.rightHandPitches);
      
      // Display chord name
      const chordSymbol = formatChordSymbol(chord.root, chord.quality);
      chordNameEl.textContent = chordSymbol;
      
      // Display substitution buttons
      const subs = getChordSubstitutions(chord.root, chord.quality);
      if (subs.length > 0) {
        subsEl.innerHTML = subs.map((sub, i) => `
          <button class="voicing-sub-btn" data-sub-index="${i}" title="${sub.description}">
            → ${sub.symbol}
          </button>
        `).join('');
        
        // Add click handlers
        subsEl.querySelectorAll('.voicing-sub-btn').forEach((btn, i) => {
          btn.addEventListener('click', () => {
            applySubstitution(chordIndex, subs[i]);
          });
        });
      } else {
        subsEl.innerHTML = '';
      }
      
      elements.voicingDescription.textContent = `${chordData.name} • ${chordData.voicingName}`;
    }

    function toggleVoicingPanel(show) {
      state.showVoicing = show !== undefined ? show : !state.showVoicing;
      elements.voicingPanel.classList.toggle('visible', state.showVoicing);
      elements.voicingBtn.classList.toggle('active', state.showVoicing);
      
      if (state.showVoicing) {
        renderVoicing();
      }
    }

    function renderLibrary() {
      let html = '';
      PROGRESSION_LIBRARY.forEach((prog, index) => {
        html += `
          <div class="library-item" data-index="${index}">
            <div class="library-item-name">${prog.name}</div>
            <div class="library-item-chords">${prog.chords.join(' → ')}</div>
            <div class="library-item-style">${prog.style}</div>
          </div>
        `;
      });
      elements.libraryGrid.innerHTML = html;
    }

    // ============================================
    // CHORD DICTIONARY FUNCTIONS
    // ============================================
    
    function renderDictChordGrid() {
      const chords = CHORD_CATEGORIES[state.dictCategory] || [];
      
      let html = '';
      chords.forEach(quality => {
        const isActive = quality === state.dictQuality;
        const chordInfo = getChordTypeInfo(quality);
        const symbol = chordInfo ? chordInfo.symbol : quality;
        
        html += `
          <button class="dict-chord-btn ${isActive ? 'active' : ''}" data-quality="${quality}">
            ${state.dictRoot}${symbol}
          </button>
        `;
      });
      
      elements.dictChordGrid.innerHTML = html;
      
      // Add click handlers
      elements.dictChordGrid.querySelectorAll('.dict-chord-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.dictQuality = btn.dataset.quality;
          renderDictChordGrid();
          renderDictChordInfo();
        });
      });
    }
    
    function getChordTypeInfo(quality) {
      for (const level of ['simple', 'seventh', 'extended', 'altered']) {
        if (CHORD_TYPES[level][quality]) {
          return CHORD_TYPES[level][quality];
        }
      }
      return null;
    }
    
    function renderDictChordInfo() {
      const { dictRoot, dictQuality } = state;
      const chordInfo = getChordTypeInfo(dictQuality);
      
      if (!chordInfo) return;
      
      // Chord name and full name
      const symbol = formatChordSymbol(dictRoot, dictQuality);
      elements.dictChordName.textContent = symbol;
      elements.dictChordFullName.textContent = `${NOTE_DISPLAY[dictRoot] || dictRoot} ${chordInfo.name}`;
      
      // Formula
      elements.dictChordFormula.textContent = CHORD_FORMULAS[dictQuality] || '—';
      
      // Substitutions
      const subs = getChordSubstitutions(dictRoot, dictQuality);
      if (subs.length > 0) {
        elements.dictSubstitutions.innerHTML = subs.map(sub => `
          <button class="voicing-sub-btn" title="${sub.description}">
            ${sub.symbol} <span style="font-size: 0.65rem; opacity: 0.7;">(${sub.description})</span>
          </button>
        `).join('');
        
        // Add click handlers to load that chord
        elements.dictSubstitutions.querySelectorAll('.voicing-sub-btn').forEach((btn, i) => {
          btn.addEventListener('click', () => {
            state.dictRoot = subs[i].root;
            state.dictQuality = subs[i].quality;
            elements.dictRootSelect.value = state.dictRoot;
            
            // Find and activate the right category
            for (const [cat, qualities] of Object.entries(CHORD_CATEGORIES)) {
              if (qualities.includes(state.dictQuality)) {
                state.dictCategory = cat;
                updateDictCategoryButtons();
                break;
              }
            }
            
            renderDictChordGrid();
            renderDictChordInfo();
          });
        });
      } else {
        elements.dictSubstitutions.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">No common substitutions</span>';
      }
      
      // Voicings
      renderDictVoicings();
    }
    
    function renderDictVoicings() {
      const { dictRoot, dictQuality } = state;
      const voicingData = KEYBOARD_VOICINGS[dictQuality];
      
      if (!voicingData) {
        elements.dictVoicingList.innerHTML = '<div style="color: var(--text-muted);">No voicings available</div>';
        return;
      }
      
      let html = '';
      voicingData.voicings.forEach((voicing, i) => {
        const leftNotes = voicing.left.map(interval => formatNoteDisplay(spellInterval(dictRoot, interval))).join(' ');
        const rightNotes = voicing.right.map(interval => formatNoteDisplay(spellInterval(dictRoot, interval))).join(' ');
        
        html += `
          <div class="dict-voicing-item" data-index="${i}">
            <div class="dict-voicing-name">${voicing.name}</div>
            <div class="dict-voicing-notes">
              <div class="dict-hand">
                <div class="dict-hand-label">L.H.</div>
                <div class="dict-hand-notes">${leftNotes}</div>
              </div>
              <div class="dict-hand">
                <div class="dict-hand-label">R.H.</div>
                <div class="dict-hand-notes">${rightNotes}</div>
              </div>
            </div>
          </div>
        `;
      });
      
      elements.dictVoicingList.innerHTML = html;
    }
    
    function updateDictCategoryButtons() {
      elements.dictCategories.querySelectorAll('.dict-category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === state.dictCategory);
      });
    }
    
    function initChordDictionary() {
      // Set up category buttons
      elements.dictCategories.querySelectorAll('.dict-category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.dictCategory = btn.dataset.category;
          // Select first chord in category
          state.dictQuality = CHORD_CATEGORIES[state.dictCategory][0];
          updateDictCategoryButtons();
          renderDictChordGrid();
          renderDictChordInfo();
        });
      });
      
      // Set up root select
      elements.dictRootSelect.addEventListener('change', (e) => {
        state.dictRoot = e.target.value;
        renderDictChordGrid();
        renderDictChordInfo();
      });
      
      // Initial render
      renderDictChordGrid();
      renderDictChordInfo();
    }

