function timeAgo(dateInput) {
  const date = new Date(dateInput);

  // ✅ UTC → KST 보정
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const kstDate = new Date(utc + (9 * 60 * 60 * 1000));

  // 🔧 작성시간, 현재시간 모두 초·밀리초 잘라낸 '분 단위 기준 시간'
  const kstTimeStripped = new Date(
    kstDate.getFullYear(),
    kstDate.getMonth(),
    kstDate.getDate(),
    kstDate.getHours(),
    kstDate.getMinutes()
  );

  const now = new Date();
  const nowStripped = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes()
  );

  const diffMin = Math.floor((nowStripped - kstTimeStripped) / (1000 * 60));

  // 🕐 "방금 전"은 아예 '0분 전'일 때로 처리
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


function createCommentElement({ comment_id, nickname, user_id, comment_content, createdAt, isMine, is_liked, like_count }) {
  const li = document.createElement('li');
  li.className = 'comment-item';
  li.id = `comment-${comment_id}`;

  const timeText = timeAgo(createdAt);

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

  // 댓글 작성
  document.querySelector('#comment-form')?.addEventListener('submit', function (e) {
    e.preventDefault();

    // 입력된 댓글 내용 가져오기
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
  if (data.error || !data.comment_id || !data.comment_content || !data.nickname) {
    throw new Error(data.error || '댓글 등록 실패');
  }

  const commentList = document.querySelector('#comment-list');

  // 댓글 엘리먼트 생성 및 삽입
  const newCommentEl = createCommentElement({
    comment_id: data.comment_id,
    nickname: data.nickname,
    user_id: data.user_id,
    comment_content: data.comment_content,
    createdAt: data.createdAt || new Date(), // 서버가 보낸 createdAt이 없을 경우 현재 시간
    isMine: true, // 내가 쓴 댓글이므로 true
    is_liked: false,
    like_count: 0
  });

  commentList.prepend(newCommentEl);

  // 입력창 초기화
  contentInput.value = '';

  // 댓글 수 증가
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
    const confirmed = confirm('정말로 게시글을 삭제할까요?');
    if (!confirmed) return;

    fetch(`/community/post/${postId}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok) {
          alert('게시글이 삭제되었습니다.');
          window.location.href = '/community';
        } else {
          return res.json().then(data => {
            throw new Error(data.error || '삭제 실패');
          });
        }
      })
      .catch(err => {
        console.error(err);
        alert('게시글 삭제 중 오류가 발생했습니다.');
      });
  });

  // 댓글 삭제
  document.querySelector('#comment-list')?.addEventListener('click', function (e) {
    if (e.target.classList.contains('comment-delete')) {
      const commentId = e.target.dataset.commentId;
      const confirmed = confirm('정말로 댓글을 삭제할까요?');
      if (!confirmed) return;

      fetch(`/community/detail/${postId}/comment/${commentId}`, {
        method: 'DELETE'
      })
        .then(res => {
          if (res.ok) {
            const commentElement = document.querySelector(`#comment-${commentId}`);
            if (commentElement) commentElement.remove();

            const commentCount = document.querySelector('#comment-count');
            if (commentCount) {
              commentCount.textContent = Math.max(parseInt(commentCount.textContent) - 1, 0);
            }
          } else {
            return res.json().then(data => {
              throw new Error(data.error || '삭제 실패');
            });
          }
        })
        .catch(err => {
          console.error(err);
          alert('댓글 삭제 중 오류가 발생했습니다.');
        });
    }
  });

  // 댓글 좋아요
  document.querySelector('#comment-list')?.addEventListener('click', function (e) {
    const iconWrapper = e.target.closest('.comment-like-icon');
    if (!iconWrapper) return;

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
  });
});
