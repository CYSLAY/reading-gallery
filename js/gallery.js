

        (function initHeroVideo() {
            var hero = document.querySelector('.site-hero');
            var videos = Array.prototype.slice.call(document.querySelectorAll('.hero-video'));
            if (!hero || videos.length < 2) return;

            var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
            var activeIndex = 0;
            var inView = true;
            var readyCount = 0;
            var switching = false;

            function playActive() {
                if (document.hidden || !inView || reduceMotion.matches || readyCount < videos.length) return;
                var playPromise = videos[activeIndex].play();
                if (playPromise && playPromise.catch) playPromise.catch(function() {});
            }

            function pauseAll() {
                videos.forEach(function(video) { video.pause(); });
            }

            function switchSegment() {
                if (switching) return;
                switching = true;

                var current = videos[activeIndex];
                var nextIndex = activeIndex === 0 ? 1 : 0;
                var next = videos[nextIndex];

                next.pause();
                next.currentTime = 0;
                next.classList.remove('is-secondary');
                current.classList.add('is-secondary');
                activeIndex = nextIndex;

                var playPromise = next.play();
                if (playPromise && playPromise.catch) playPromise.catch(function() {});

                current.currentTime = 0;
                switching = false;
            }

            function markReady() {
                readyCount += 1;
                if (readyCount === videos.length) {
                    videos[0].currentTime = 0;
                    videos[1].currentTime = 0;
                    playActive();
                }
            }

            videos.forEach(function(video) {
                video.addEventListener('ended', switchSegment);
                if (video.readyState >= 1) markReady();
                else video.addEventListener('loadedmetadata', markReady, { once: true });
            });

            if (typeof IntersectionObserver !== 'undefined') {
                new IntersectionObserver(function(entries) {
                    inView = entries[0].isIntersecting;
                    if (inView) playActive();
                    else pauseAll();
                }, { threshold: 0.01 }).observe(hero);
            }

            document.addEventListener('visibilitychange', function() {
                if (document.hidden) pauseAll();
                else playActive();
            });
            if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', function() {
                if (reduceMotion.matches) pauseAll();
                else playActive();
            });
            else if (reduceMotion.addListener) reduceMotion.addListener(function() {
                if (reduceMotion.matches) pauseAll();
                else playActive();
            });
        })();

        function openModal(id) {
            document.getElementById('modal-' + id).classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        function closeModal(id) {
            document.getElementById('modal-' + id).classList.remove('active');
            document.body.style.overflow = '';
        }
        function closeModalOnOverlay(event, id) {
            if (event.target === event.currentTarget) {
                closeModal(id);
            }
        }

        document.querySelectorAll('.book-card:not(:first-child) .book-summary').forEach(function(summary) {
            var text = summary.textContent.replace(/\s+/g, ' ').trim();
            var firstSentence = text.match(/^.*?[。！？]/);
            summary.textContent = firstSentence ? firstSentence[0] : text;
            summary.setAttribute('aria-label', '重点读后观点：' + summary.textContent);
        });

        const shelfBooks = document.querySelectorAll('.shelf-book');
        const bookshelfScroll = document.querySelector('.bookshelf-scroll');
        var bookshelfYearSelect = null;
        var bookshelfMonthSelect = null;
        var shelfSuffixEl = null;
        try {
            bookshelfYearSelect = document.getElementById('shelf-year-select');
            bookshelfMonthSelect = document.getElementById('shelf-month-select');
            shelfSuffixEl = document.querySelector('.shelf-suffix');
        } catch(e) {}
        const shelfSlideClasses = ['shelf-slide-out-left', 'shelf-slide-out-right', 'shelf-slide-in-left', 'shelf-slide-in-right'];
        const shelfSlideDuration = 260;
        let currentShelfPeriod = null;
        let shelfAnimationTimer = null;

        function getShelfBookDate(book) {
            const match = (book.dataset.date || '').match(/(\d{4})-(\d{2})-(\d{2})/);
            if (!match) return null;
            return { year: match[1], month: match[2], day: match[3] };
        }

        function setupBookshelfMonthOptions() {
            if (!bookshelfYearSelect || !bookshelfMonthSelect) return;

            const dates = Array.from(shelfBooks).map(getShelfBookDate).filter(Boolean);
            if (!dates.length) return;

            const years = Array.from(new Set(dates.map(function(date) { return date.year; }))).sort();

            bookshelfYearSelect.innerHTML = years.map(function(year) {
                return '<option selected>' + year + '</option>';
            }).join('');

            updateBookshelfMonthOptions('all');
        }

        function updateBookshelfMonthOptions(preferredMonth) {
            if (!bookshelfYearSelect || !bookshelfMonthSelect) return;

            var selectedYear = bookshelfYearSelect.value;
            var months = Array.from(new Set(Array.from(shelfBooks).map(getShelfBookDate).filter(function(date) {
                return date && date.year === selectedYear;
            }).map(function(date) {
                return date.month;
            }))).sort();

            var isAll = preferredMonth === 'all' || !months.includes(preferredMonth);
            var selectedMonth = isAll ? 'all' : preferredMonth;

            var html = '<option value="all"' + (selectedMonth === 'all' ? ' selected' : '') + '>全部</option>';
            html += months.map(function(month) {
                var label = String(Number(month)) + '月';
                return '<option value="' + month + '"' + (month === selectedMonth ? ' selected' : '') + '>' + label + '</option>';
            }).join('');
            bookshelfMonthSelect.innerHTML = html;

            // Update suffix text
            if (shelfSuffixEl) {
                shelfSuffixEl.textContent = (selectedMonth === 'all') ? '无用之用' : '月书架';
            }
        }

        function getSelectedShelfPeriod() {
            if (!bookshelfYearSelect || !bookshelfMonthSelect) return '';
            var year = bookshelfYearSelect.value;
            var month = bookshelfMonthSelect.value;
            if (month === 'all') return year + '-all';
            return year + '-' + String(month).padStart(2, '0');
        }

        function clearShelfSlideClasses(book) {
            shelfSlideClasses.forEach(function(className) {
                book.classList.remove(className);
            });
        }

        function bookMatchesPeriod(book, period) {
            var date = getShelfBookDate(book);
            if (!date) return false;
            if (period.indexOf('-all') > -1) return date.year === period.split('-')[0];
            return (date.year + '-' + date.month) === period;
        }

        function filterBookshelfBySelectedMonth(options) {
            if (!bookshelfYearSelect || !bookshelfMonthSelect) return;

            const targetPeriod = getSelectedShelfPeriod();
            const shouldAnimate = options && options.animate && currentShelfPeriod && currentShelfPeriod !== targetPeriod;

            if (shelfAnimationTimer) {
                window.clearTimeout(shelfAnimationTimer);
                shelfAnimationTimer = null;
            }

            shelfBooks.forEach(clearShelfSlideClasses);

            if (!shouldAnimate) {
                shelfBooks.forEach(function(book) {
                    book.hidden = !bookMatchesPeriod(book, targetPeriod);
                });

                if (bookshelfScroll) {
                    bookshelfScroll.scrollLeft = 0;
                }

                currentShelfPeriod = targetPeriod;
                return;
            }

            var direction = targetPeriod > currentShelfPeriod ? 'next' : 'prev';
            const outgoingClass = direction === 'next' ? 'shelf-slide-out-left' : 'shelf-slide-out-right';
            const incomingClass = direction === 'next' ? 'shelf-slide-in-right' : 'shelf-slide-in-left';
            const visibleBooks = Array.from(shelfBooks).filter(function(book) {
                return !book.hidden;
            });

            visibleBooks.forEach(function(book) {
                book.classList.add(outgoingClass);
            });

            shelfAnimationTimer = window.setTimeout(function() {
                shelfBooks.forEach(function(book) {
                    clearShelfSlideClasses(book);
                    const isTargetBook = bookMatchesPeriod(book, targetPeriod);
                    book.hidden = !isTargetBook;
                    if (isTargetBook) {
                        book.classList.add(incomingClass);
                    }
                });

                if (bookshelfScroll) {
                    bookshelfScroll.scrollLeft = 0;
                }

                window.requestAnimationFrame(function() {
                    shelfBooks.forEach(function(book) {
                        book.classList.remove(incomingClass);
                    });
                });

                currentShelfPeriod = targetPeriod;
                shelfAnimationTimer = null;
            }, shelfSlideDuration);
        }

        shelfBooks.forEach(function(book) {
            book.addEventListener('click', function() {
                openModal(book.dataset.bookId);
            });
            /* 悬停封面浮窗智能定位：优先右侧，空间不够则翻到左侧 */
            book.addEventListener('mouseenter', function() {
                var cover = book.querySelector('.spine-cover');
                if (!cover) return;
                var bookRect = book.getBoundingClientRect();
                /* 封面宽度 ≈ 书脊高度 × 0.66 + 12px 间距 */
                var coverW = bookRect.height * 0.66 + 12;
                var viewWidth = window.innerWidth;
                /* 右侧剩余空间 = 视口宽度 - 书脊右边缘 */
                var spaceRight = viewWidth - bookRect.right;
                if (spaceRight < coverW + 8) {
                    cover.classList.add('cover-left');
                } else {
                    cover.classList.remove('cover-left');
                }
            });
        });

        if (bookshelfYearSelect && bookshelfMonthSelect) {
            setupBookshelfMonthOptions();
            filterBookshelfBySelectedMonth();

            bookshelfYearSelect.addEventListener('change', function() {
                updateBookshelfMonthOptions();
                filterBookshelfBySelectedMonth({ animate: true });
            });

            bookshelfMonthSelect.addEventListener('change', function() {
                filterBookshelfBySelectedMonth({ animate: true });
            });
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(function(modal) {
                    modal.classList.remove('active');
                });
                document.body.style.overflow = '';
            }
        });

        /* ===== 书架响应式缩放（使用 zoom 而非 transform:scale） =====
         * zoom 同时影响布局盒和视觉盒，不会出现布局/视觉不一致导致的书脊变形。
         * transform:scale() 只改变视觉尺寸不改变布局盒，在 overflow:hidden 容器中
         * 会产生渲染异常导致书脊宽高比失控。zoom 从根本上避免此问题。 */
        var bookshelfEl = document.querySelector('.bookshelf');
        /* 根据可见书本数动态调整书架对齐：满行（≥15本）铺满，不满靠左 */
        var SPREAD_THRESHOLD = 15;
        function syncShelfJustify() {
            if (!bookshelfEl) return;
            var vis = Array.from(bookshelfEl.querySelectorAll('.shelf-book')).filter(function(b) {
                return window.getComputedStyle(b).display !== 'none' && !b.hidden;
            });
            bookshelfEl.style.justifyContent = (vis.length >= SPREAD_THRESHOLD) ? 'space-between' : 'flex-start';
        }

        function autoScaleBookshelf() {
            if (!bookshelfEl || !bookshelfScroll) return;

            /* 1. 完全重置，先在原始尺寸下测量 */
            bookshelfEl.style.zoom = '';
            bookshelfEl.classList.remove('is-scaled');

            /* 2. 强制 reflow */
            void bookshelfScroll.offsetHeight;

            /* 3. 获取真正可见的书籍 */
            var visibleBooks = Array.from(bookshelfEl.querySelectorAll('.shelf-book')).filter(function(b) {
                return window.getComputedStyle(b).display !== 'none';
            });
            if (!visibleBooks.length) return;

            /* 4. 直接读取书架真实内容宽度 */
            var scrollStyle = window.getComputedStyle(bookshelfScroll);
            var sidePadding = parseFloat(scrollStyle.paddingLeft) + parseFloat(scrollStyle.paddingRight);
            var containerWidth = bookshelfScroll.clientWidth - sidePadding;
            var unscaledWidth = Math.max(
                bookshelfEl.scrollWidth,
                bookshelfEl.getBoundingClientRect().width
            );
            var safeWidth = Math.max(containerWidth - 10, 0);

            /* 5. 用 zoom 等比缩放（同时影响布局和视觉，保证宽高比锁定） */
            var needScale = (unscaledWidth > safeWidth && safeWidth > 0);
            if (needScale) {
                var scale = safeWidth / unscaledWidth;
                bookshelfEl.style.zoom = scale.toFixed(5);
                bookshelfEl.classList.add('is-scaled');
            }
            syncShelfJustify();
        }

        /* 初始化 + resize 监听 + 月份切换后调用 */
        autoScaleBookshelf();
        var shelfResizeFrame = 0;
        function scheduleBookshelfScale() {
            cancelAnimationFrame(shelfResizeFrame);
            shelfResizeFrame = requestAnimationFrame(autoScaleBookshelf);
        }
        window.addEventListener('resize', scheduleBookshelfScale);
        /* 注意：不监听 ResizeObserver 来触发 autoScaleBookshelf，
           因为书脊 hover 时宽度变化会触发循环调用，导致页面快速抖动。
           autoScale 已在 init、window resize 和月份切换时主动调用。 */

        /* 挂钩到筛选函数：在动画完成后重新计算缩放
         * filter 有两条路径：
         *   - 非动画（首次加载）：立即生效 → 立即算
         *   - 动画（切换月份）：260ms 滑出 + rAF 清理 → 需等 ~350ms 后才算
         */
        var _origFilter = (typeof filterBookshelfBySelectedMonth === 'function') ? filterBookshelfBySelectedMonth : null;
        if (_origFilter) {
            filterBookshelfBySelectedMonth = function(opts) {
                _origFilter.call(this, opts);
                /* 第一次调用：覆盖非动画路径（立即生效的情况） */
                setTimeout(autoScaleBookshelf, 20);
                /* 第二次调用：覆盖动画路径（260ms 动画 + rAF 清理后） */
                setTimeout(autoScaleBookshelf, 380);
            };
        }

        /* ===== 全年书架（超过 20 本时启用） ===== */
        (function setupAnnualShelf() {
            var bookCountEl = document.getElementById('book-count');
            var toggleBtn = document.getElementById('annual-toggle');
            var shelfScroll = document.querySelector('.bookshelf-scroll');
            var annualShelf = document.getElementById('annual-shelf');
            if (!bookCountEl || !toggleBtn || !shelfScroll || !annualShelf) return;

            /* 每次都从原始书架取真实书（避免克隆后重复计数） */
            function getRealBooks() {
                return Array.from(document.querySelectorAll('.bookshelf > .shelf-book'));
            }

            var allBooks = getRealBooks();
            var total = allBooks.length;
            bookCountEl.textContent = String(total);

            /* 规范：真实书 ≤20 本时隐藏展开控件，仅保留现有真实书架 */
            if (total <= 20) {
                toggleBtn.hidden = true;
                return;
            }
            toggleBtn.hidden = false;

            /* 按读完日期倒序，每行最多 20 本，最后一行靠左 */
            var MAX_VISIBLE = 20;
            var MAX_PER_ROW = 20;
            function getDateSortKey(book) {
                var m = (book.dataset.date || '').match(/(\d{4})-(\d{2})-(\d{2})/);
                return m ? (m[1] + m[2] + m[3]) : '00000000';
            }
            function sortedBooks() {
                return getRealBooks().slice().sort(function(a, b) {
                    return getDateSortKey(b).localeCompare(getDateSortKey(a));
                });
            }

            /* 默认单排书架只显示最新 MAX_VISIBLE 本，超出的隐藏 */
            function limitShelfToLatest() {
                var books = sortedBooks();
                /* 先全部显示再隐藏超出部分 */
                books.forEach(function(b) { b.style.display = ''; });
                if (books.length > MAX_VISIBLE) {
                    for (var i = MAX_VISIBLE; i < books.length; i++) {
                        books[i].style.display = 'none';
                    }
                }
            }

            /* 当前是否处于「全部」视图（年份-all） */
            function isAllPeriod() {
                if (typeof getSelectedShelfPeriod !== 'function') return true;
                var p = getSelectedShelfPeriod() || '';
                return p.indexOf('-all') > -1;
            }

            var expanded = false;
            var building = false; /* 防重入锁 */

            /* 视图联动：「全部」视图才显示展开按钮和 20 本限制；
             * 选具体月份时隐藏按钮、解除限制（该月的书全部显示）、强制收起第二行 */
            function syncAnnualControls() {
                if (isAllPeriod()) {
                    toggleBtn.hidden = false;
                    if (!expanded) limitShelfToLatest();
                } else {
                    toggleBtn.hidden = true;
                    /* 立即收起（无动画，避免与月份切换动画叠加） */
                    if (expanded) {
                        expanded = false;
                        annualShelf.classList.remove('is-visible', 'is-collapsing');
                        annualShelf.innerHTML = '';
                        while (annualShelf.firstChild) {
                            annualShelf.removeChild(annualShelf.firstChild);
                        }
                        toggleBtn.textContent = '展开';
                    }
                    /* 解除 20 本限制：月份视图由 hidden 属性筛选，display 全部还原 */
                    getRealBooks().forEach(function(b) { b.style.display = ''; });
                }
                syncShelfJustify();
            }
            syncAnnualControls();

            /* 年份/月份切换时同步（在筛选逻辑之后执行） */
            var yearSel = document.getElementById('shelf-year-select');
            var monthSel = document.getElementById('shelf-month-select');
            [yearSel, monthSel].forEach(function(sel) {
                if (!sel) return;
                sel.addEventListener('change', function() {
                    /* 等筛选与滑动动画完成后再同步（动画约 260ms） */
                    setTimeout(syncAnnualControls, 0);
                    setTimeout(function() {
                        syncAnnualControls();
                        autoScaleBookshelf();
                    }, 400);
                });
            });

            /* 构建全年第二行（只克隆超出的书；第一行由单排书架承担，保持不动） */
            function buildAnnualRows() {
                if (building) return;
                building = true;
                var books = sortedBooks();
                /* 只取超出的书（第 MAX_VISIBLE 本之后），第一行原位不动 */
                var overflow = books.slice(MAX_VISIBLE);

                /* 强力清空：防止任何残留或重复 */
                annualShelf.innerHTML = '';
                while (annualShelf.firstChild) {
                    annualShelf.removeChild(annualShelf.firstChild);
                }

                if (overflow.length > 0) {
                    for (var j = 0; j < overflow.length; j += MAX_PER_ROW) {
                        /* 缩放包装器：transform 隔离在此层 */
                        var wrap = document.createElement('div');
                        wrap.className = 'annual-scale-wrap';

                        var row = document.createElement('div');
                        row.className = 'annual-row';
                        var chunk = overflow.slice(j, j + MAX_PER_ROW);
                        chunk.forEach(function(orig) {
                            var clone = orig.cloneNode(true);
                            clone.hidden = false;
                            clone.style.display = ''; /* 重置 display（原始可能被 limitShelfToLatest 隐藏） */
                            clone.classList.remove('shelf-slide-out-left', 'shelf-slide-out-right', 'shelf-slide-in-left', 'shelf-slide-in-right');
                            clone.addEventListener('click', function() {
                                openModal(clone.dataset.bookId);
                            });
                            row.appendChild(clone);
                        });
                        wrap.appendChild(row);
                        annualShelf.appendChild(wrap);
                    }
                }
                building = false;

                /* DOM 写入完成后缩放 */
                requestAnimationFrame(function() {
                    scaleAnnualRows();
                    requestAnimationFrame(scaleAnnualRows);
                });
            }

            /* 每行复用第一行（单排书架）的缩放比例，使用 zoom 保证宽高比锁定 */
            function scaleAnnualRows() {
                var bookshelfEl = document.querySelector('.bookshelf');
                if (!bookshelfEl) return;
                /* 读取第一行当前 zoom 值 */
                var firstRowZoom = 1;
                var zs = bookshelfEl.style.zoom || '';
                var zm = zs.match(/([\d.]+)/);
                if (zm) firstRowZoom = parseFloat(zm[1]);

                annualShelf.querySelectorAll('.annual-scale-wrap').forEach(function(wrap) {
                    /* zoom 同时影响布局和视觉，无需额外高度计算 */
                    wrap.style.zoom = firstRowZoom.toFixed(5);
                    wrap.style.transform = '';
                    wrap.style.height = '';
                });
            }

            /* 用 class 切换显隐（替代 hidden 属性，更可靠） */
            function setExpanded(state) {
                if (expanded === state) return; /* 防重复调用 */
                expanded = state;

                if (expanded) {
                    /* 不隐藏单排书架：第一行保持不动，只在其下方丝滑展开第二行（溢出的书） */
                    buildAnnualRows();
                    /* 强制 reflow 后触发动画 */
                    void annualShelf.offsetHeight;
                    annualShelf.classList.remove('is-collapsing');
                    annualShelf.classList.add('is-visible');
                    toggleBtn.textContent = '收起';
                    /* 动画结束后再缩放（确保尺寸稳定） */
                    annualShelf.addEventListener('animationend', function onDown(e) {
                        if (e.animationName === 'shelfRevealDown') {
                            annualShelf.removeEventListener('animationend', onDown);
                            scaleAnnualRows();
                        }
                    });
                } else {
                    /* 播放上滑动画后再清空第二行（单排书架始终不动） */
                    annualShelf.classList.remove('is-visible');
                    annualShelf.classList.add('is-collapsing');
                    toggleBtn.textContent = '展开';

                    annualShelf.addEventListener('animationend', function onUp(e) {
                        if (e.animationName === 'shelfRevealUp') {
                            annualShelf.removeEventListener('animationend', onUp);
                            annualShelf.classList.remove('is-collapsing');
                            annualShelf.innerHTML = ''; /* 彻底销毁克隆节点 */
                            while (annualShelf.firstChild) {
                                annualShelf.removeChild(annualShelf.firstChild);
                            }
                            limitShelfToLatest(); /* 恢复单排只显示最新20本（一行始终未变） */
                            autoScaleBookshelf();
                        }
                    });
                }
            }

            toggleBtn.addEventListener('click', function() {
                setExpanded(!expanded);
            });

            var resizeTimer = null;
            window.addEventListener('resize', function() {
                if (resizeTimer) clearTimeout(resizeTimer);
                resizeTimer = setTimeout(function() {
                    if (expanded) scaleAnnualRows();
                }, 80);
            });
        })();
    