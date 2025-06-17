package com.xupt.book.Service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.Mapper.CommentMapper;
import com.xupt.book.Pojo.Comment;
import com.xupt.book.Service.CommentService;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

@Service
public class CommentServiceImpl implements CommentService {
    @Resource
    private CommentMapper commentMapper;

    @Override
    public boolean addComment(Comment comment) {
        return commentMapper.insert(comment) > 0;
    }

    @Override
    public boolean updateCommentMsg(Comment comment) {
        return commentMapper.updateById(comment) > 0;
    }

    @Override
    public boolean deleteComment(Integer id) {
        return commentMapper.deleteById(id) > 0;
    }

    @Override
    public IPage<Comment> getCommentsPage(Integer pageNum, Integer pageSize, Integer songId, Integer songListId) {
        LambdaQueryWrapper<Comment> queryWrapper = new LambdaQueryWrapper<>();
        if (songId != null) {
            queryWrapper.eq(Comment::getSongId, songId);
        }
        if (songListId != null) {
            queryWrapper.eq(Comment::getSongListId, songListId);
        }
        Page<Comment> page = new Page<>(pageNum, pageSize);
        return commentMapper.selectPage(page, queryWrapper);
    }


    @Override
    public Comment getCommentById(Integer id) {
        return commentMapper.selectById(id);
    }

    @Override
    public boolean likeComment(Integer id) {
        return commentMapper.incrementLikeCount(id);
    }

}