using DeepLens.Application.Abstractions.Data;
using DeepLens.Application.Abstractions.IdGeneration;
using DeepLens.Contracts.Customers;
using DeepLens.Domain.Entities;
using DeepLens.Infrastructure.Services;
using Moq;
using NUnit.Framework;
using FluentAssertions;

namespace DeepLens.Infrastructure.Tests;

[TestFixture]
public class CustomerServiceTests
{
    private Mock<ICustomerRepository> _repositoryMock;
    private Mock<ISequencedIdGenerator> _idGeneratorMock;
    private CustomerService _service;

    [SetUp]
    public void Setup()
    {
        _repositoryMock = new Mock<ICustomerRepository>();
        _idGeneratorMock = new Mock<ISequencedIdGenerator>();
        _service = new CustomerService(_repositoryMock.Object, _idGeneratorMock.Object);
    }

    [Test]
    public async Task GetCustomerByIdAsync_NonExistentCustomer_ReturnsNull()
    {
        var id = Guid.NewGuid();
        _repositoryMock.Setup(r => r.GetByIdAsync(id))
            .ReturnsAsync((Customer?)null);

        var result = await _service.GetCustomerByIdAsync(id);

        result.Should().BeNull();
    }

    [Test]
    public async Task GetAllCustomersAsync_CalculatesTotalPagesCorrectly()
    {
        var customers = new List<Customer>
        {
            new Customer { Id = Guid.NewGuid(), FirstName = "Ananya" }
        };

        _repositoryMock.Setup(r => r.GetAllAsync(null, "createdAt", "desc", 10, 0, null, null, null, null))
            .ReturnsAsync((customers, 25));

        var response = await _service.GetAllCustomersAsync(page: 1, pageSize: 10);

        response.TotalCount.Should().Be(25);
        response.TotalPages.Should().Be(3);
        response.Customers.Should().HaveCount(1);
    }

    [Test]
    public async Task CreateCustomerAsync_ExistingPhone_ReturnsExistingCustomer()
    {
        var existing = new Customer
        {
            Id = Guid.NewGuid(),
            FirstName = "Ananya",
            PhoneNumber = "+919876543210"
        };

        _repositoryMock.Setup(r => r.GetByPhoneOrInstagramAsync("+919876543210", null))
            .ReturnsAsync(existing);

        var request = new CreateCustomerRequest(
            FirstName: "Ananya",
            LastName: null,
            PhoneNumber: "+919876543210",
            InstagramId: null,
            Email: null,
            Notes: null,
            Gender: null,
            InstagramAccounts: null,
            PreferredLanguages: null,
            Addresses: null
        );

        var result = await _service.CreateCustomerAsync(request);

        result.Should().NotBeNull();
        result.Id.Should().Be(existing.Id);
        _repositoryMock.Verify(r => r.CreateAsync(It.IsAny<Customer>()), Times.Never);
    }
}
