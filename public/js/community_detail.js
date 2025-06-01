// 상대 시간 계산 함수
function timeAgo(dateInput) {
  const date = new Date(dateInput);

  // UTC → KST 변환
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const kstDate = new Date(utc + (9 * 60 * 60 * 1000));

  const kstTimeStripped = new Date(
    kstDate.getFullYear(), kstDate.getMonth(), kstDate.getDate(),
    kstDate.getHours(), kstDate.getMinutes()
  );

  const now = new Date();
  const nowStripped = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(),
    now.getHours(), now.getMinutes()
  );

  const diffMin = Math.floor((nowStripped - kstTimeStripped) / (1000 * 60));
  if (diffMin === 0) return '방금 전';
  if (diffMin === 1) return '1분 전';
  if (diffMin < 60) return `${diffMin}분 전`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return '1시간 전';
  if (diffHr < 24) return `${diffHr}시간 전`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return '1일 전';
  if (diffDay < 7) return `${diffDay}일 전`;

  return `${kstDate.getFullYear()}-${(kstDate.getMonth() + 1).toString().padStart(2, '0')}-${kstDate.getDate().toString().padStart(2, '0')}`;
}

// 댓글 DOM 생성 함수
function createCommentElement({ comment_id, nickname, comment_content, createdAt, isMine, is_liked, like_count, badge }) {
  const li = document.createElement('li');
  li.className = 'comment-item';
  li.id = `comment-${comment_id}`;
  const timeText = timeAgo(createdAt);

  let badgeImg = '';
  if (badge === 'gold') {
    badgeImg = '<img src="/img/gold.png" class="badge-img" />';
  } else if (badge === 'silver') {
    badgeImg = '<img src="/img/silver.png" class="badge-img" />';
  }

  li.innerHTML = `
    <div class="comment-header">
      <div class="comment-user-info">
        <div class="user-avatar small">
          <i class="fa-solid fa-user-circle user-icon"></i>
        </div>
        <div>
          <strong>${nickname}</strong><br>
          <small style="font-size: 12px; color: #888;">${timeText}</small>
        </div>
      </div>
      ${isMine ? `<small class="comment-delete" data-comment-id="${comment_id}">댓글삭제</small>` : ''}
    </div>
    <p class="comment-content">${comment_content}</p>
    <div class="reaction-bar right" data-comment-id="${comment_id}">
      <span class="comment-like-icon" style="cursor:pointer;">
        <i class="${is_liked ? 'fa-solid' : 'fa-regular'} fa-heart" style="${is_liked ? 'color:red;' : ''}"></i>
      </span>
      <span class="comment-like-count">${like_count || 0}</span>
    </div>
  `;
  return li;
}

document.addEventListener('DOMContentLoaded', () => {
  const { postId, liked: initialLiked, scrapped: initialScrapped } = window.initialPostState;
  let liked = initialLiked;
  let scrapped = initialScrapped;

  // 게시글 좋아요 토글
  const likeIcon = document.querySelector('#like-icon');
  const likeCount = document.querySelector('#like-count');
  likeIcon?.addEventListener('click', () => {
    fetch(`/community/like/${postId}`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          liked = data.liked;
          likeCount.textContent = parseInt(likeCount.textContent) + (liked ? 1 : -1);
          const icon = likeIcon.querySelector('i');
          icon.className = liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
          icon.style.color = liked ? 'red' : '';
        }
      });
  });

  // 게시글 스크랩 토글
  const scrapIcon = document.querySelector('#scrap-icon');
  const scrapCount = document.querySelector('#scrap-count');
  scrapIcon?.addEventListener('click', () => {
    fetch(`/community/scrap/${postId}`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          scrapped = data.scrapped;
          scrapCount.textContent = parseInt(scrapCount.textContent) + (scrapped ? 1 : -1);
          const icon = scrapIcon.querySelector('i');
          icon.className = scrapped ? 'fa-solid fa-star' : 'fa-regular fa-star';
          icon.style.color = scrapped ? '#FFEE00' : '';
        }
      });
  });

  // 댓글 작성 처리
  document.querySelector('#comment-form')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const contentInput = document.querySelector('#comment-content');
    const content = contentInput.value.trim();
    if (!content) return;

    fetch(`/community/detail/${postId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error || !data.comment_id) throw new Error(data.error || '댓글 등록 실패');

        const commentList = document.querySelector('#comment-list');
        const newCommentEl = createCommentElement({
          comment_id: data.comment_id,
          nickname: data.nickname,
          comment_content: data.comment_content,
          createdAt: data.createdAt || new Date(),
          isMine: true,
          is_liked: false,
          like_count: 0,
          badge: data.badge
        });

        commentList.prepend(newCommentEl);
        contentInput.value = '';

        const commentCount = document.querySelector('#comment-count');
        if (commentCount) {
          commentCount.textContent = parseInt(commentCount.textContent) + 1;
        }
      })
      .catch(err => {
        console.error('댓글 등록 오류:', err);
        alert('댓글 등록 중 문제가 발생했습니다.');
      });
  });

  // 게시글 삭제
  document.querySelector('#delete-post')?.addEventListener('click', () => {
    if (!confirm('정말로 게시글을 삭제할까요?')) return;

    fetch(`/community/post/${postId}`, { method: 'DELETE' })
      .then(res => res.ok
        ? window.location.href = '/community'
        : res.json().then(data => { throw new Error(data.error); }))
      .catch(err => {
        console.error(err);
        alert('게시글 삭제 중 오류가 발생했습니다.');
      });
  });

  // 댓글 삭제 및 좋아요 처리
  document.querySelector('#comment-list')?.addEventListener('click', function (e) {
    // 댓글 삭제
    if (e.target.classList.contains('comment-delete')) {
      const commentId = e.target.dataset.commentId;
      if (!confirm('정말로 댓글을 삭제할까요?')) return;

      fetch(`/community/detail/${postId}/comment/${commentId}`, { method: 'DELETE' })
        .then(res => {
          if (res.ok) {
            document.querySelector(`#comment-${commentId}`)?.remove();
            const commentCount = document.querySelector('#comment-count');
            if (commentCount) {
              commentCount.textContent = Math.max(parseInt(commentCount.textContent) - 1, 0);
            }
          } else {
            return res.json().then(data => { throw new Error(data.error); });
          }
        })
        .catch(err => {
          console.error(err);
          alert('댓글 삭제 중 오류가 발생했습니다.');
        });
    }

    // 댓글 좋아요 토글
    const iconWrapper = e.target.closest('.comment-like-icon');
    if (iconWrapper) {
      const commentItem = e.target.closest('.reaction-bar');
      const commentId = commentItem?.dataset.commentId;
      const countSpan = commentItem?.querySelector('.comment-like-count');
      const icon = iconWrapper.querySelector('i');
      if (!commentId || !icon || !countSpan) return;

      fetch(`/community/like/comment/${commentId}`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const liked = data.liked;
            const currentCount = parseInt(countSpan.textContent);
            countSpan.textContent = liked ? currentCount + 1 : currentCount - 1;

            icon.classList.toggle('fa-solid', liked);
            icon.classList.toggle('fa-regular', !liked);
            icon.style.color = liked ? 'red' : '';
          }
        })
        .catch(err => {
          console.error('댓글 좋아요 오류:', err);
          alert('좋아요 처리 중 문제가 발생했습니다.');
        });
    }
  });
});
