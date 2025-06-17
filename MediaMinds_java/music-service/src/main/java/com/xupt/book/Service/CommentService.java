package com.xupt.book.Service;


import com.baomidou.mybatisplus.core.metadata.IPage;
import com.xupt.book.Pojo.Comment;

public interface CommentService {

    boolean addComment(Comment comment);

    boolean updateCommentMsg(Comment comment);

    boolean deleteComment(Integer id);

    IPage<Comment> getCommentsPage(Integer pageNum, Integer pageSize, Integer songId, Integer songListId);

    Comment getCommentById(Integer id);

    boolean likeComment(Integer id);
}
