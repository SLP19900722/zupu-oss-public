package com.familytree.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.familytree.entity.AuditRecord;
import com.familytree.entity.FamilyMember;
import com.familytree.mapper.AuditRecordMapper;
import com.familytree.mapper.FamilyMemberMapper;
import com.familytree.service.FamilyMemberService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class FamilyMemberServiceImpl extends ServiceImpl<FamilyMemberMapper, FamilyMember> implements FamilyMemberService {

    @Autowired
    private AuditRecordMapper auditRecordMapper;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private LambdaQueryWrapper<FamilyMember> approvedWrapper(boolean includeHidden) {
        LambdaQueryWrapper<FamilyMember> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FamilyMember::getAuditStatus, 1)
                .eq(FamilyMember::getDeleted, 0);
        if (!includeHidden) {
            wrapper.eq(FamilyMember::getIsExternalSpouse, 0);
        }
        return wrapper;
    }

    private LambdaQueryWrapper<FamilyMember> undeletedWrapper() {
        LambdaQueryWrapper<FamilyMember> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FamilyMember::getDeleted, 0);
        return wrapper;
    }

    @Override
    public List<FamilyMember> getAllMembers() {
        List<FamilyMember> members = baseMapper.selectList(approvedWrapper(false));
        fillVisibleSpouseNames(members);
        decorateVisibleMembers(members);
        return members;
    }

    @Override
    public List<FamilyMember> searchMembers(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return getAllMembers();
        }
        List<FamilyMember> members = baseMapper.searchByKeyword(keyword);
        fillVisibleSpouseNames(members);
        decorateVisibleMembers(members);
        return members;
    }

    @Override
    public FamilyMember getMemberById(Long id) {
        if (id == null) {
            return null;
        }
        LambdaQueryWrapper<FamilyMember> wrapper = approvedWrapper(false);
        wrapper.eq(FamilyMember::getId, id);
        FamilyMember member = baseMapper.selectOne(wrapper);
        fillVisibleSpouseName(member);
        decorateVisibleMember(member);
        return member;
    }

    @Override
    public FamilyMember getMemberByIdIncludingHidden(Long id) {
        if (id == null) {
            return null;
        }
        LambdaQueryWrapper<FamilyMember> wrapper = approvedWrapper(true);
        wrapper.eq(FamilyMember::getId, id);
        FamilyMember member = baseMapper.selectOne(wrapper);
        decorateMemberIdentity(member);
        if (isVisibleMember(member)) {
            fillVisibleSpouseName(member);
        }
        return member;
    }

    @Override
    public FamilyMember getAnyMemberById(Long id) {
        if (id == null) {
            return null;
        }
        LambdaQueryWrapper<FamilyMember> wrapper = undeletedWrapper();
        wrapper.eq(FamilyMember::getId, id);
        FamilyMember member = baseMapper.selectOne(wrapper);
        decorateMemberIdentity(member);
        if (isVisibleMember(member)) {
            fillVisibleSpouseName(member);
        }
        return member;
    }

    @Override
    public List<FamilyMember> getBindableMembers() {
        return getBindableMembers(null, false);
    }

    @Override
    public List<FamilyMember> getBindableMembers(Long currentUserId, boolean isAdmin) {
        List<FamilyMember> visibleMembers = baseMapper.selectList(approvedWrapper(false));
        List<FamilyMember> bindableVisibleMembers = new ArrayList<>();
        for (FamilyMember member : visibleMembers) {
            if (isBindableVisibleMember(member)) {
                // 非管理员且成员已被其他用户绑定，则跳过
                if (!isAdmin && member.getUserId() != null 
                    && !Objects.equals(member.getUserId(), currentUserId)) {
                    continue;
                }
                bindableVisibleMembers.add(member);
            }
        }
        fillVisibleSpouseNames(bindableVisibleMembers);
        decorateVisibleMembers(bindableVisibleMembers);

        // 优化：批量查询所有男性成员的外部配偶，避免 N+1 查询
        ensureExternalSpousesForMembers(bindableVisibleMembers);

        List<FamilyMember> bindableMembers = baseMapper.selectList(approvedWrapper(true));
        List<FamilyMember> result = new ArrayList<>();
        for (FamilyMember member : bindableMembers) {
            decorateMemberIdentity(member);
            if (!isBindableMember(member)) {
                continue;
            }
            if (!isVisibleMember(member)
                    && (member.getDisplayMemberId() == null || member.getDisplayMemberId() <= 0)) {
                continue;
            }
            if (isVisibleMember(member)) {
                fillVisibleSpouseName(member);
            }
            result.add(member);
        }

        result.sort((left, right) -> {
            boolean leftHidden = isExternalSpouse(left);
            boolean rightHidden = isExternalSpouse(right);
            if (leftHidden != rightHidden) {
                return leftHidden ? 1 : -1;
            }

            int generationCompare = Integer.compare(
                    safeInt(left == null ? null : left.getGeneration()),
                    safeInt(right == null ? null : right.getGeneration()));
            if (generationCompare != 0) {
                return generationCompare;
            }

            int sortCompare = Integer.compare(
                    safeInt(left == null ? null : left.getSortOrder()),
                    safeInt(right == null ? null : right.getSortOrder()));
            if (sortCompare != 0) {
                return sortCompare;
            }

            String leftName = normalizeText(left == null ? null : left.getName());
            String rightName = normalizeText(right == null ? null : right.getName());
            if (leftName == null && rightName == null) {
                return Long.compare(safeLong(left == null ? null : left.getId()), safeLong(right == null ? null : right.getId()));
            }
            if (leftName == null) {
                return 1;
            }
            if (rightName == null) {
                return -1;
            }
            int nameCompare = leftName.compareTo(rightName);
            if (nameCompare != 0) {
                return nameCompare;
            }
            return Long.compare(safeLong(left == null ? null : left.getId()), safeLong(right == null ? null : right.getId()));
        });

        return result;
    }

    /**
     * 批量为男性成员创建外部配偶，避免 N+1 查询问题
     * 优化前：每个男性成员执行一次数据库查询
     * 优化后：一次性批量查询所有外部配偶
     */
    private void ensureExternalSpousesForMembers(List<FamilyMember> members) {
        if (members == null || members.isEmpty()) {
            return;
        }

        // 收集所有男性成员 ID
        List<Long> maleMemberIds = members.stream()
            .filter(m -> m != null && Objects.equals(m.getGender(), 1))
            .map(FamilyMember::getId)
            .collect(Collectors.toList());

        if (maleMemberIds.isEmpty()) {
            return;
        }

        // 一次性批量查询所有外部配偶
        LambdaQueryWrapper<FamilyMember> wrapper = approvedWrapper(true);
        wrapper.eq(FamilyMember::getIsExternalSpouse, 1)
               .in(FamilyMember::getSpouseId, maleMemberIds);
        List<FamilyMember> existingSpouses = baseMapper.selectList(wrapper);

        // 构建映射：ownerId → spouse
        Map<Long, FamilyMember> spouseMap = existingSpouses.stream()
            .filter(spouse -> spouse != null && spouse.getSpouseId() != null)
            .collect(Collectors.toMap(
                FamilyMember::getSpouseId,
                spouse -> spouse,
                (existing, replacement) -> existing
            ));

        // 内存中判断是否需要创建，按需创建外部配偶
        for (FamilyMember member : members) {
            if (member != null && Objects.equals(member.getGender(), 1)) {
                FamilyMember existingSpouse = spouseMap.get(member.getId());
                if (existingSpouse == null && member.getSpouseName() != null) {
                    // 需要创建外部配偶
                    ensureExternalSpouseForMember(member.getId());
                }
            }
        }
    }

    @Override
    public FamilyMember getExternalSpouseByOwnerId(Long ownerMemberId) {
        if (ownerMemberId == null || ownerMemberId <= 0) {
            return null;
        }
        FamilyMember spouse = findAnyExternalSpouseByOwnerId(ownerMemberId);
        decorateMemberIdentity(spouse);
        return spouse;
    }

    @Override
    public FamilyMember ensureExternalSpouseForMember(Long ownerMemberId) {
        FamilyMember owner = getVisibleOwnerById(ownerMemberId);
        if (owner == null || !Objects.equals(owner.getGender(), 1) || isDeceased(owner)) {
            return null;
        }

        FamilyMember existing = findAnyExternalSpouseByOwnerId(ownerMemberId);
        String ownerSpouseName = normalizeText(owner.getSpouseName());
        if (existing != null) {
            boolean changed = false;
            if (!Objects.equals(existing.getSpouseId(), ownerMemberId)) {
                existing.setSpouseId(ownerMemberId);
                changed = true;
            }
            if (!Objects.equals(existing.getIsExternalSpouse(), 1)) {
                existing.setIsExternalSpouse(1);
                changed = true;
            }
            if (!Objects.equals(existing.getGender(), 2)) {
                existing.setGender(2);
                changed = true;
            }
            if (existing.getGeneration() == null && owner.getGeneration() != null) {
                existing.setGeneration(owner.getGeneration());
                changed = true;
            }
            if (existing.getCreatorId() == null && owner.getCreatorId() != null) {
                existing.setCreatorId(owner.getCreatorId());
                changed = true;
            }
            if (normalizeText(existing.getName()) == null && ownerSpouseName != null) {
                existing.setName(ownerSpouseName);
                changed = true;
            }
            if (changed) {
                baseMapper.updateById(existing);
            }
            syncOwnerSpouseNameCache(owner, normalizeText(existing.getName()));
            decorateMemberIdentity(existing);
            return existing;
        }

        if (ownerSpouseName == null) {
            return null;
        }

        FamilyMember spouse = new FamilyMember();
        spouse.setName(ownerSpouseName);
        spouse.setGender(2);
        spouse.setGeneration(owner.getGeneration());
        spouse.setSpouseId(owner.getId());
        spouse.setIsExternalSpouse(1);
        spouse.setAuditStatus(1);
        spouse.setIsAlive(1);
        spouse.setCreatorId(owner.getCreatorId());
        spouse.setSortOrder(owner.getSortOrder());
        baseMapper.insert(spouse);

        syncOwnerSpouseNameCache(owner, ownerSpouseName);
        recordExternalSpouseCreated(owner, spouse);
        decorateMemberIdentity(spouse);
        return spouse;
    }

    @Override
    public FamilyMember bindExternalSpouseIdentity(Long userId, Long ownerMemberId, String spouseName) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("User not found");
        }
        if (ownerMemberId == null || ownerMemberId <= 0) {
            throw new IllegalArgumentException("Please select the husband member to attach to");
        }

        String normalizedName = normalizeText(spouseName);
        if (normalizedName == null) {
            throw new IllegalArgumentException("Please enter the spouse name");
        }

        FamilyMember owner = getVisibleOwnerById(ownerMemberId);
        if (owner == null || !Objects.equals(owner.getGender(), 1)) {
            throw new IllegalArgumentException("The selected husband must be an approved male member");
        }

        FamilyMember spouse = findAnyExternalSpouseByOwnerId(ownerMemberId);
        if (spouse != null && spouse.getUserId() != null && !Objects.equals(spouse.getUserId(), userId)) {
            throw new IllegalStateException("The spouse identity for this member is already bound to another account");
        }

        boolean created = spouse == null;
        if (created) {
            spouse = new FamilyMember();
            spouse.setCreatorId(userId);
            spouse.setIsAlive(1);
        }

        spouse.setName(normalizedName);
        spouse.setGender(2);
        spouse.setFatherId(null);
        spouse.setMotherId(null);
        spouse.setMotherName(null);
        spouse.setSpouseId(owner.getId());
        spouse.setIsExternalSpouse(1);
        spouse.setAuditStatus(1);
        spouse.setGeneration(owner.getGeneration());
        spouse.setSortOrder(owner.getSortOrder());
        spouse.setUserId(userId);
        if (spouse.getCreatorId() == null) {
            spouse.setCreatorId(userId);
        }

        if (created) {
            baseMapper.insert(spouse);
        } else {
            baseMapper.updateById(spouse);
        }

        syncOwnerSpouseNameCache(owner, normalizedName);
        recordExternalSpouseAudit(owner, spouse, created ? "bind_create_hidden_spouse" : "bind_update_hidden_spouse");
        decorateMemberIdentity(spouse);
        return spouse;
    }

    @Override
    public boolean createMember(FamilyMember member) {
        if (member != null) {
            Integer currentGeneration = member.getGeneration();
            if (currentGeneration == null || currentGeneration <= 0) {
                member.setGeneration(computeGeneration(member.getFatherId(), member.getMotherId()));
            }
        }
        return baseMapper.insert(member) > 0;
    }

    @Override
    public boolean updateMember(Long id, FamilyMember member) {
        member.setId(id);
        return baseMapper.updateById(member) > 0;
    }

    @Override
    public boolean deleteMember(Long id) {
        return baseMapper.deleteById(id) > 0;
    }

    @Override
    public List<FamilyMember> getChildren(Long parentId) {
        List<FamilyMember> children = baseMapper.findChildren(parentId);
        fillVisibleSpouseNames(children);
        decorateVisibleMembers(children);
        return children;
    }

    @Override
    public List<FamilyMember> getParents(Long memberId) {
        List<FamilyMember> parents = baseMapper.findParents(memberId);
        fillVisibleSpouseNames(parents);
        decorateVisibleMembers(parents);
        return parents;
    }

    @Override
    public List<FamilyMember> getFamilyTree() {
        List<FamilyMember> members = baseMapper.selectList(approvedWrapper(false));
        fillVisibleSpouseNames(members);
        decorateVisibleMembers(members);
        return members;
    }

    private Integer computeGeneration(Long fatherId, Long motherId) {
        int generation = 1;
        FamilyMember father = fatherId == null ? null : baseMapper.selectById(fatherId);
        FamilyMember mother = motherId == null ? null : baseMapper.selectById(motherId);

        if (father != null && father.getGeneration() != null) {
            generation = Math.max(generation, father.getGeneration() + 1);
        }
        if (mother != null && mother.getGeneration() != null) {
            generation = Math.max(generation, mother.getGeneration() + 1);
        }
        return generation;
    }

    private void decorateVisibleMembers(List<FamilyMember> members) {
        if (members == null) {
            return;
        }
        for (FamilyMember member : members) {
            decorateVisibleMember(member);
        }
    }

    private void decorateVisibleMember(FamilyMember member) {
        if (member == null) {
            return;
        }
        member.setIdentityType("MEMBER");
        member.setPreferredMemberVisible(true);
        member.setDisplayMemberId(member.getId());
        member.setDisplayMemberName(member.getName());
        member.setSpouseOwnerMemberId(null);
        member.setSpouseOwnerMemberName(null);
    }

    private void decorateMemberIdentity(FamilyMember member) {
        if (member == null) {
            return;
        }
        if (!isExternalSpouse(member)) {
            decorateVisibleMember(member);
            return;
        }

        Long ownerId = member.getSpouseId();
        FamilyMember owner = ownerId == null ? null : getVisibleOwnerById(ownerId);
        member.setIdentityType("EXTERNAL_SPOUSE");
        member.setPreferredMemberVisible(false);
        member.setDisplayMemberId(owner == null ? null : owner.getId());
        member.setDisplayMemberName(owner == null ? null : owner.getName());
        member.setSpouseOwnerMemberId(owner == null ? ownerId : owner.getId());
        member.setSpouseOwnerMemberName(owner == null ? null : owner.getName());
    }

    private void fillVisibleSpouseNames(List<FamilyMember> members) {
        if (members == null || members.isEmpty()) {
            return;
        }

        List<Long> ownerIds = new ArrayList<>();
        for (FamilyMember member : members) {
            if (member != null && member.getId() != null && !isExternalSpouse(member)) {
                ownerIds.add(member.getId());
            }
        }

        Map<Long, FamilyMember> spouseMap = loadApprovedExternalSpouseMap(ownerIds);
        for (FamilyMember member : members) {
            if (member == null || member.getId() == null || isExternalSpouse(member)) {
                continue;
            }
            FamilyMember spouse = spouseMap.get(member.getId());
            if (spouse != null) {
                member.setSpouseName(normalizeText(spouse.getName()));
                member.setSpouseId(spouse.getId());
            }
        }
    }

    private void fillVisibleSpouseName(FamilyMember member) {
        if (member == null || member.getId() == null || isExternalSpouse(member)) {
            return;
        }
        Map<Long, FamilyMember> spouseMap = loadApprovedExternalSpouseMap(Collections.singletonList(member.getId()));
        FamilyMember spouse = spouseMap.get(member.getId());
        if (spouse != null) {
            member.setSpouseName(normalizeText(spouse.getName()));
            member.setSpouseId(spouse.getId());
        }
    }

    private Map<Long, FamilyMember> loadApprovedExternalSpouseMap(List<Long> ownerIds) {
        if (ownerIds == null || ownerIds.isEmpty()) {
            return Collections.emptyMap();
        }

        LambdaQueryWrapper<FamilyMember> wrapper = approvedWrapper(true);
        wrapper.eq(FamilyMember::getIsExternalSpouse, 1)
                .in(FamilyMember::getSpouseId, ownerIds)
                .orderByAsc(FamilyMember::getId);
        List<FamilyMember> spouses = baseMapper.selectList(wrapper);

        Map<Long, FamilyMember> map = new HashMap<>();
        for (FamilyMember spouse : spouses) {
            if (spouse == null || spouse.getSpouseId() == null || map.containsKey(spouse.getSpouseId())) {
                continue;
            }
            map.put(spouse.getSpouseId(), spouse);
        }
        return map;
    }

    private FamilyMember findAnyExternalSpouseByOwnerId(Long ownerMemberId) {
        if (ownerMemberId == null || ownerMemberId <= 0) {
            return null;
        }
        LambdaQueryWrapper<FamilyMember> wrapper = undeletedWrapper();
        wrapper.eq(FamilyMember::getIsExternalSpouse, 1)
                .eq(FamilyMember::getSpouseId, ownerMemberId)
                .orderByAsc(FamilyMember::getId)
                .last("LIMIT 1");
        return baseMapper.selectOne(wrapper);
    }

    private FamilyMember getVisibleOwnerById(Long ownerMemberId) {
        if (ownerMemberId == null || ownerMemberId <= 0) {
            return null;
        }
        LambdaQueryWrapper<FamilyMember> wrapper = approvedWrapper(false);
        wrapper.eq(FamilyMember::getId, ownerMemberId);
        return baseMapper.selectOne(wrapper);
    }

    private void syncOwnerSpouseNameCache(FamilyMember owner, String spouseName) {
        if (owner == null || owner.getId() == null || isExternalSpouse(owner)) {
            return;
        }
        String normalized = normalizeText(spouseName);
        if (Objects.equals(normalizeText(owner.getSpouseName()), normalized)) {
            return;
        }
        owner.setSpouseName(normalized);
        baseMapper.updateById(owner);
    }

    private void recordExternalSpouseCreated(FamilyMember owner, FamilyMember spouse) {
        recordExternalSpouseAudit(owner, spouse, "auto_create_hidden_spouse");
    }

    private void recordExternalSpouseAudit(FamilyMember owner, FamilyMember spouse, String auditResult) {
        try {
            AuditRecord record = new AuditRecord();
            record.setAuditType(1);
            record.setTargetType("external_spouse");
            record.setTargetId(spouse == null ? null : spouse.getId());
            record.setSubmitterId(owner == null ? null : owner.getCreatorId());
            record.setAuditorId(owner == null ? null : owner.getCreatorId());
            record.setAuditStatus(1);
            record.setAuditResult(auditResult);
            record.setSubmittedAt(LocalDateTime.now());
            record.setAuditedAt(LocalDateTime.now());
            record.setContent(objectMapper.writeValueAsString(spouse));
            auditRecordMapper.insert(record);
        } catch (Exception ignored) {
        }
    }

    private boolean isVisibleMember(FamilyMember member) {
        return member != null
                && Objects.equals(member.getAuditStatus(), 1)
                && !isExternalSpouse(member);
    }

    private boolean isBindableVisibleMember(FamilyMember member) {
        return isVisibleMember(member) && !isDeceased(member);
    }

    private boolean isBindableMember(FamilyMember member) {
        if (member == null || !Objects.equals(member.getAuditStatus(), 1)) {
            return false;
        }
        if (isExternalSpouse(member)) {
            FamilyMember owner = member.getSpouseId() == null ? null : getVisibleOwnerById(member.getSpouseId());
            return owner != null && !isDeceased(owner);
        }
        return !isDeceased(member);
    }

    private boolean isExternalSpouse(FamilyMember member) {
        return member != null && Objects.equals(member.getIsExternalSpouse(), 1);
    }

    private boolean isDeceased(FamilyMember member) {
        return member != null && Objects.equals(member.getIsAlive(), 0);
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().replaceAll("\\s+", " ");
        return normalized.isEmpty() ? null : normalized;
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private long safeLong(Long value) {
        return value == null ? 0L : value;
    }
}
