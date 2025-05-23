function timeAgo(dateInput) {
  const date = new Date(dateInput);
  const now = new Date(); // Node는 UTC

  // ✅ 클라이언트는 KST기준, 브라우저 시간대 사용
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 1000 / 60);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;

  return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
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
  document.querySelector('#comment-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const content = document.querySelector('#comment-content').value;

    fetch(`/community/detail/${postId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
        .then(res => res.json())
        .then(data => {
            if (data.comment_content && data.nickname) {
                const commentList = document.querySelector('#comment-list');
                const newComment = document.createElement('li');
                newComment.id = `comment-${data.comment_id}`;
                newComment.className = 'comment-item';
                newComment.innerHTML = `
                    <div class="comment-header">
                        <div class="comment-user-info">
                            <div class="user-avatar small"></div>
                            <strong>${data.nickname}</strong>
                        </div>
                        ${data.isMine ? `<small class="comment-delete" data-comment-id="${data.comment_id}">댓글삭제</small>` : `<small>${data.timeAgo}</small>`}
                    </div>
                    <p class="comment-content">${data.comment_content}</p>
                    <div class="reaction-bar right" data-comment-id="${data.comment_id}">
                        <span class="comment-like-icon" style="cursor:pointer;">
                            <i class="fa-regular fa-heart"></i>
                        </span>
                        <span class="comment-like-count">0</span>
                    </div>
                `;
            commentList.appendChild(newComment);
            document.querySelector('#comment-content').value = '';

            // ✅ 댓글 수 증가
            const commentCount = document.querySelector('#comment-count');
                if (commentCount) {
                    commentCount.textContent = parseInt(commentCount.textContent) + 1;
                }
        } else {
          alert('댓글 등록에 실패했습니다.');
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
            // ✅ 댓글 수 감소
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
  document.querySelector('#comment-list')?.addEventListener('click', function(e) {
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
