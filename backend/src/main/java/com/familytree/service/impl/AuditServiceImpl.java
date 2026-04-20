package com.familytree.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.familytree.entity.AuditRecord;
import com.familytree.entity.FamilyMember;
import com.familytree.mapper.AuditRecordMapper;
import com.familytree.mapper.FamilyMemberMapper;
import com.familytree.service.AuditService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Slf4j
@Service
public class AuditServiceImpl implements AuditService {

    @Autowired
    private FamilyMemberMapper familyMemberMapper;

    @Autowired
    private AuditRecordMapper auditRecordMapper;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public List<FamilyMember> getPendingMembers() {
        LambdaQueryWrapper<FamilyMember> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FamilyMember::getAuditStatus, 0)
                .eq(FamilyMember::getDeleted, 0);
        wrapper.orderByDesc(FamilyMember::getCreateTime);
        return familyMemberMapper.selectList(wrapper);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean auditMember(Long id, Integer status, String remark, Long auditorId) {
        try {
            FamilyMember member = familyMemberMapper.selectById(id);
            if (member == null) {
                return false;
            }

            LambdaQueryWrapper<AuditRecord> recordWrapper = new LambdaQueryWrapper<>();
            recordWrapper.eq(AuditRecord::getTargetId, id)
                    .eq(AuditRecord::getTargetType, "member")
                    .eq(AuditRecord::getAuditStatus, 0)
                    .orderByDesc(AuditRecord::getSubmittedAt)
                    .last("LIMIT 1");
            AuditRecord pendingRecord = auditRecordMapper.selectOne(recordWrapper);

            FamilyMember oldMemberSnapshot = pendingRecord == null
                    ? null
                    : deserializeMember(pendingRecord.getOldContent());

            if (status != null && status == 2 && oldMemberSnapshot != null) {
                oldMemberSnapshot.setId(id);
                oldMemberSnapshot.setAuditStatus(1);
                oldMemberSnapshot.setAuditorId(auditorId);
                oldMemberSnapshot.setAuditTime(LocalDateTime.now());
                oldMemberSnapshot.setAuditRemark(remark);
                familyMemberMapper.updateById(oldMemberSnapshot);
            } else {
                member.setAuditStatus(status);
                member.setAuditorId(auditorId);
                member.setAuditTime(LocalDateTime.now());
                member.setAuditRemark(remark);
                familyMemberMapper.updateById(member);
            }

            FamilyMember auditedMember = familyMemberMapper.selectById(id);
            syncSpouseLinks(auditedMember, oldMemberSnapshot);
            syncExternalSpouseDisplay(auditedMember, oldMemberSnapshot);

            if (pendingRecord != null) {
                pendingRecord.setAuditStatus(status);
                pendingRecord.setAuditorId(auditorId);
                pendingRecord.setAuditResult(remark);
                pendingRecord.setAuditedAt(LocalDateTime.now());
                auditRecordMapper.updateById(pendingRecord);
            } else {
                AuditRecord record = new AuditRecord();
                record.setAuditType(1);
                record.setTargetId(id);
                record.setTargetType("member");
                record.setSubmitterId(member.getCreatorId());
                record.setAuditorId(auditorId);
                record.setAuditStatus(status);
                record.setAuditResult(remark);
                record.setAuditedAt(LocalDateTime.now());
                record.setSubmittedAt(LocalDateTime.now());

                try {
                    record.setContent(objectMapper.writeValueAsString(auditedMember));
                } catch (Exception e) {
                    log.error("serialize audited member failed", e);
                }

                auditRecordMapper.insert(record);
            }

            return true;
        } catch (Exception e) {
            log.error("audit member failed", e);
            return false;
        }
    }

    @Override
    public List<AuditRecord> getAuditHistory(Long memberId) {
        LambdaQueryWrapper<AuditRecord> wrapper = new LambdaQueryWrapper<>();
        if (memberId != null) {
            wrapper.eq(AuditRecord::getTargetId, memberId);
            wrapper.eq(AuditRecord::getTargetType, "member");
        }
        wrapper.orderByDesc(AuditRecord::getCreatedAt);
        return auditRecordMapper.selectList(wrapper);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long submitMemberAudit(FamilyMember member) {
        try {
            member.setAuditStatus(0);
            familyMemberMapper.insert(member);

            AuditRecord record = new AuditRecord();
            record.setAuditType(1);
            record.setTargetId(member.getId());
            record.setTargetType("member");
            record.setSubmitterId(member.getCreatorId());
            record.setAuditStatus(0);
            record.setSubmittedAt(LocalDateTime.now());

            try {
                record.setContent(objectMapper.writeValueAsString(member));
            } catch (Exception e) {
                log.error("serialize member content failed", e);
            }

            auditRecordMapper.insert(record);
            return record.getId();
        } catch (Exception e) {
            log.error("submit member audit failed", e);
            throw new RuntimeException("提交审核失败");
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long submitMemberUpdateAudit(FamilyMember member, FamilyMember oldMember) {
        try {
            member.setAuditStatus(0);
            familyMemberMapper.updateById(member);

            AuditRecord record = new AuditRecord();
            record.setAuditType(2);
            record.setTargetId(member.getId());
            record.setTargetType("member");
            record.setSubmitterId(member.getCreatorId());
            record.setAuditStatus(0);
            record.setSubmittedAt(LocalDateTime.now());

            try {
                record.setContent(objectMapper.writeValueAsString(member));
                record.setOldContent(objectMapper.writeValueAsString(oldMember));
            } catch (Exception e) {
                log.error("serialize member update failed", e);
            }

            auditRecordMapper.insert(record);
            return record.getId();
        } catch (Exception e) {
            log.error("submit member update audit failed", e);
            throw new RuntimeException("提交更新审核失败");
        }
    }

    private FamilyMember deserializeMember(String content) {
        if (content == null || content.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.readValue(content, FamilyMember.class);
        } catch (Exception e) {
            log.error("deserialize member content failed", e);
            return null;
        }
    }

    private void syncSpouseLinks(FamilyMember currentMember, FamilyMember oldMemberSnapshot) {
        if (currentMember == null || currentMember.getId() == null) {
            return;
        }

        if ((currentMember.getSpouseName() != null && !currentMember.getSpouseName().trim().isEmpty())
                || (oldMemberSnapshot != null && oldMemberSnapshot.getSpouseName() != null && !oldMemberSnapshot.getSpouseName().trim().isEmpty())
                || (currentMember.getIsExternalSpouse() != null && currentMember.getIsExternalSpouse() == 1)) {
            return;
        }

        Long currentMemberId = currentMember.getId();
        Long oldSpouseId = oldMemberSnapshot == null ? null : oldMemberSnapshot.getSpouseId();

        if (!isApproved(currentMember)) {
            clearReciprocalSpouse(currentMember.getSpouseId(), currentMemberId);
            if (oldSpouseId != null && !Objects.equals(oldSpouseId, currentMember.getSpouseId())) {
                clearReciprocalSpouse(oldSpouseId, currentMemberId);
            }
            return;
        }

        Long newSpouseId = currentMember.getSpouseId();
        if (oldSpouseId != null && !Objects.equals(oldSpouseId, newSpouseId)) {
            clearReciprocalSpouse(oldSpouseId, currentMemberId);
        }

        if (newSpouseId == null) {
            return;
        }

        FamilyMember spouse = familyMemberMapper.selectById(newSpouseId);
        if (spouse == null || !isApproved(spouse)) {
            return;
        }

        Long spouseOldSpouseId = spouse.getSpouseId();
        if (spouseOldSpouseId != null && !Objects.equals(spouseOldSpouseId, currentMemberId)) {
            clearReciprocalSpouse(spouseOldSpouseId, spouse.getId());
        }

        if (!Objects.equals(spouse.getSpouseId(), currentMemberId)) {
            spouse.setSpouseId(currentMemberId);
            familyMemberMapper.updateById(spouse);
        }
    }

    private void clearReciprocalSpouse(Long spouseId, Long expectedPartnerId) {
        if (spouseId == null) {
            return;
        }

        FamilyMember spouse = familyMemberMapper.selectById(spouseId);
        if (spouse == null) {
            return;
        }

        if (Objects.equals(spouse.getSpouseId(), expectedPartnerId)) {
            spouse.setSpouseId(null);
            familyMemberMapper.updateById(spouse);
        }
    }

    private boolean isApproved(FamilyMember member) {
        return member != null && Objects.equals(member.getAuditStatus(), 1);
    }

    private void syncExternalSpouseDisplay(FamilyMember currentMember, FamilyMember oldMemberSnapshot) {
        if (currentMember == null) {
            return;
        }

        if (isExternalSpouse(currentMember)) {
            syncOwnerSpouseCache(currentMember.getSpouseId(), currentMember.getName());
            if (oldMemberSnapshot != null && !Objects.equals(oldMemberSnapshot.getSpouseId(), currentMember.getSpouseId())) {
                syncOwnerSpouseFromApprovedExternal(oldMemberSnapshot.getSpouseId());
            }
            return;
        }

        syncOwnerSpouseFromApprovedExternal(currentMember.getId());
    }

    private void syncOwnerSpouseFromApprovedExternal(Long ownerId) {
        if (ownerId == null) {
            return;
        }

        LambdaQueryWrapper<FamilyMember> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FamilyMember::getDeleted, 0)
                .eq(FamilyMember::getAuditStatus, 1)
                .eq(FamilyMember::getIsExternalSpouse, 1)
                .eq(FamilyMember::getSpouseId, ownerId)
                .orderByAsc(FamilyMember::getId)
                .last("LIMIT 1");
        FamilyMember spouse = familyMemberMapper.selectOne(wrapper);
        if (spouse != null) {
            syncOwnerSpouseCache(ownerId, spouse.getName());
        }
    }

    private void syncOwnerSpouseCache(Long ownerId, String spouseName) {
        if (ownerId == null) {
            return;
        }
        FamilyMember owner = familyMemberMapper.selectById(ownerId);
        if (owner == null) {
            return;
        }
        String normalized = normalizeText(spouseName);
        if (Objects.equals(normalizeText(owner.getSpouseName()), normalized)) {
            return;
        }
        owner.setSpouseName(normalized);
        familyMemberMapper.updateById(owner);
    }

    private boolean isExternalSpouse(FamilyMember member) {
        return member != null && Objects.equals(member.getIsExternalSpouse(), 1);
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().replaceAll("\\s+", " ");
        return normalized.isEmpty() ? null : normalized;
    }
}
