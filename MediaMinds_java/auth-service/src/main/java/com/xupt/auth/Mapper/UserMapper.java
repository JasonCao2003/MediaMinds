package com.xupt.auth.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xupt.auth.Pojo.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface UserMapper extends BaseMapper<User> {

    @Select("SELECT * FROM user WHERE user_name = #{userName}")
    User selectByUserName(String userName);

    @Select("SELECT * FROM user WHERE email = #{email}")
    User selectByEmail(String email);

    @Update("UPDATE user SET avatar=#{avatarUrl}, updated_at=now() WHERE user_id=#{userId}")
    void updateAvatar(String avatarUrl, String userId);


    /**
     * 更新用户角色
     * @param userId 用户ID
     * @param role 角色
     * @return 影响行数
     */
    @Update("UPDATE user SET role=#{role}, updated_at=now() WHERE user_id=#{userId}")
    int updateUserRole(@Param("userId") String userId, @Param("role") String role);

    /**
     * 更新用户状态
     * @param userId 用户ID
     * @param status 状态
     * @return 影响行数
     */
    @Update("UPDATE user SET status=#{status}, updated_at=now() WHERE user_id=#{userId}")
    int updateUserStatus(@Param("userId") String userId, @Param("status") String status);

    /**
     * 删除用户
     * @param userId 用户ID
     * @return 影响行数
     */
    @Delete("DELETE FROM user WHERE user_id=#{userId}")
    int deleteById(String userId);
}
