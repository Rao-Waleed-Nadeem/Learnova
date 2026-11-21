import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  serializeRouteToUrl,
  parseUrlToRoute,
  DEFAULT_PAGE_BY_PORTAL,
} from '../services/routerService.ts';

describe('Browser History & URL Routing Serialization', () => {
  test('serializeRouteToUrl generates semantic URLs without parameters', () => {
    assert.equal(serializeRouteToUrl('student', 'dashboard'), '/student/dashboard');
    assert.equal(serializeRouteToUrl('student', 'catalog'), '/student/catalog');
    assert.equal(serializeRouteToUrl('teacher', 'overview'), '/teacher/overview');
    assert.equal(serializeRouteToUrl('teacher', 'questions'), '/teacher/questions');
    assert.equal(serializeRouteToUrl('admin', 'users'), '/admin/users');
  });

  test('serializeRouteToUrl appends query parameters cleanly', () => {
    const url = serializeRouteToUrl('student', 'course_details', {
      courseId: '44444444-4444-4444-4444-444444444444',
    });
    assert.equal(url, '/student/course_details?courseId=44444444-4444-4444-4444-444444444444');

    const multiParamUrl = serializeRouteToUrl('teacher', 'curriculum', {
      courseId: 'course-1',
      topicId: 'topic-2',
    });
    assert.equal(multiParamUrl, '/teacher/curriculum?courseId=course-1&topicId=topic-2');
  });

  test('parseUrlToRoute extracts portal, page, and query parameters accurately', () => {
    const parsed = parseUrlToRoute('/student/catalog');
    assert.deepEqual(parsed, {
      portal: 'student',
      page: 'catalog',
      params: {},
    });

    const parsedWithParams = parseUrlToRoute(
      '/teacher/curriculum',
      '?courseId=44444444-4444-4444-4444-444444444444&topicId=a1111111'
    );
    assert.deepEqual(parsedWithParams, {
      portal: 'teacher',
      page: 'curriculum',
      params: {
        courseId: '44444444-4444-4444-4444-444444444444',
        topicId: 'a1111111',
      },
    });
  });

  test('parseUrlToRoute defaults invalid pages to the portal default page', () => {
    const invalidStudent = parseUrlToRoute('/student/non_existent_page');
    assert.equal(invalidStudent?.portal, 'student');
    assert.equal(invalidStudent?.page, DEFAULT_PAGE_BY_PORTAL.student);

    const invalidTeacher = parseUrlToRoute('/teacher/invalid_tab');
    assert.equal(invalidTeacher?.portal, 'teacher');
    assert.equal(invalidTeacher?.page, DEFAULT_PAGE_BY_PORTAL.teacher);
  });

  test('parseUrlToRoute returns null for root path or empty string', () => {
    assert.equal(parseUrlToRoute('/'), null);
    assert.equal(parseUrlToRoute(''), null);
  });
});
